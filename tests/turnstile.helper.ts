import { afterEach, beforeEach, vi } from "vitest";
import { env } from "../src/configuracion/env.js";
import { VERSION_DOCUMENTOS_ORGANIZADOR } from "../src/app/auth/auth.schema.js";

type Accion = "login" | "register" | "register-organizador";

export function formularioTurnstile(accion: Accion) {
	const form = new FormData();
	form.set("turnstileToken", accion);
	if (accion === "register-organizador") {
		form.set("aceptaTerminos", "si");
		form.set("aceptaPrivacidad", "si");
		form.set("versionDocumentos", VERSION_DOCUMENTOS_ORGANIZADOR);
	}
	return form;
}

export function simularTurnstile() {
	const secreto = env.TURNSTILE_SECRET_KEY;
	const hostname = env.TURNSTILE_HOSTNAME;
	const fetchOriginal = globalThis.fetch;
	beforeEach(() => {
		env.TURNSTILE_SECRET_KEY = "secreto-de-prueba";
		env.TURNSTILE_HOSTNAME = "localhost";
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
			if (input !== "https://challenges.cloudflare.com/turnstile/v0/siteverify") return fetchOriginal(input, init);
			const action = (init?.body as URLSearchParams).get("response");
			return Response.json({ success: true, action, hostname: "localhost" });
		});
	});
	afterEach(() => {
		vi.mocked(globalThis.fetch).mockRestore();
		env.TURNSTILE_SECRET_KEY = secreto;
		env.TURNSTILE_HOSTNAME = hostname;
	});
}
