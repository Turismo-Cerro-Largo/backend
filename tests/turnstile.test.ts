import { type Context, Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/configuracion/env.js";
import { verificarTurnstile } from "../src/middleware/Turnstile.js";

vi.mock("../src/configuracion/env.js", () => ({
	env: { TURNSTILE_SECRET_KEY: "secreto-de-prueba", TURNSTILE_HOSTNAME: "localhost" },
}));

describe("middleware Turnstile", () => {
	const acciones = ["login", "register", "register-organizador"] as const;
	const app = new Hono();
	const siguiente = vi.fn(async (c: Context) => {
		const body = await c.req.parseBody();
		return c.json({ email: body.email, archivo: body.archivo instanceof File ? body.archivo.name : null });
	});
	for (const accion of acciones) app.post(`/${accion}`, verificarTurnstile(accion), siguiente);
	const siteverify = vi.fn<typeof fetch>();

	function enviar(accion: (typeof acciones)[number] = "login", tokens = ["token-valido"]) {
		const body = new FormData();
		body.set("email", "prueba@example.com");
		body.set("archivo", new File(["prueba"], "frente.jpg"));
		for (const token of tokens) body.append("turnstileToken", token);
		return app.request(`/${accion}`, { method: "POST", body });
	}

	beforeEach(() => {
		vi.stubGlobal("fetch", siteverify);
		env.TURNSTILE_SECRET_KEY = "secreto-de-prueba";
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		siteverify.mockReset();
		siguiente.mockClear();
	});

	it.each(acciones)("permite %s con un token válido y conserva el formulario", async (action) => {
		siteverify.mockResolvedValue(Response.json({ success: true, action, hostname: "localhost" }));
		const res = await enviar(action);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ email: "prueba@example.com", archivo: "frente.jpg" });
		const [url, opciones] = siteverify.mock.calls[0]!;
		expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
		expect(opciones?.method).toBe("POST");
		expect(Object.fromEntries(opciones?.body as URLSearchParams)).toEqual({
			secret: "secreto-de-prueba",
			response: "token-valido",
		});
	});

	it.each([[], [""], ["x".repeat(2049)], ["uno", "dos"]].map((tokens) => ({ tokens })))(
		"rechaza un campo de token ausente o malformado",
		async ({ tokens }) => {
			expect((await enviar("login", tokens)).status).toBe(400);
			expect(siteverify).not.toHaveBeenCalled();
			expect(siguiente).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ success: false, "error-codes": ["timeout-or-duplicate"] },
		{ success: true, action: "register", hostname: "localhost" },
		{ success: true, action: "login", hostname: "otro.example" },
	])("rechaza un token inválido o de otra acción o dominio", async (resultado) => {
		siteverify.mockResolvedValue(Response.json(resultado));
		expect((await enviar()).status).toBe(400);
		expect(siguiente).not.toHaveBeenCalled();
	});

	it("bloquea el formulario si no hay secreto configurado", async () => {
		env.TURNSTILE_SECRET_KEY = "";
		expect((await enviar()).status).toBe(503);
		expect(siteverify).not.toHaveBeenCalled();
		expect(siguiente).not.toHaveBeenCalled();
	});

	it("bloquea el formulario si falla la conexión con Cloudflare", async () => {
		siteverify.mockRejectedValue(new Error("sin conexión"));
		expect((await enviar()).status).toBe(503);
		expect(siguiente).not.toHaveBeenCalled();
	});
});
