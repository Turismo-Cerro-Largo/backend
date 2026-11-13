import { it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { readFile, readdir, mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
it("ejecuta el bundle completo en workerd y registra una cuenta en D1", async () => {
	await mkdir(".wrangler", { recursive: true });
	const dir = await mkdtemp(path.resolve(".wrangler/workerd-"));
	let uploads = 0;
	const mf = new Miniflare({
		outboundService: async (request) => {
			if (new URL(request.url).origin === "https://challenges.cloudflare.com") {
				const body = await request.formData();
				return Response.json({ success: true, action: body.get("response"), hostname: "localhost" });
			}
			expect(new URL(request.url).origin).toBe("https://test.supabase.co");
			expect(request.headers.get("authorization")).toBe("Bearer test-service-role");
			expect(request.method).toBe("POST");
			expect((await request.arrayBuffer()).byteLength).toBeGreaterThan(0);
			uploads++;
			return Response.json({ Key: "test" });
		},
		modules: [
			{ type: "ESModule", path: path.resolve("dist/test-entry.js"), contents: 'import worker from "./index.js"; export default { fetch(request, env, ctx) { return worker.fetch(request, { ...env, EMAIL: { async send() {} } }, ctx); } };' },
			{ type: "ESModule", path: path.resolve("dist/index.js") },
			...(await readdir("dist"))
				.filter((f) => f.endsWith(".wasm"))
				.map((f) => ({ type: "CompiledWasm" as const, path: path.resolve("dist", f) })),
		],
		compatibilityDate: "2026-07-01",
		compatibilityFlags: ["nodejs_compat"],
		d1Databases: ["DB"],
		d1Persist: path.join(dir, "d1"),
		bindings: {
			SUPABASE_URL: "https://test.supabase.co",
			SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
			SUPABASE_STORAGE_BUCKET: "cerro-largo-files",
			COOKIE_SECRET: "workerd-test-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklm",
			NODE_ENV: "development",
			APP_PUBLIC_URL: "http://localhost:5173",
			APP_ORIGINS: "http://localhost:5173",
			TURNSTILE_SECRET_KEY: "test-turnstile",
			MAIL_FROM: "no-reply@example.test",
		},
	});
	try {
		const db = await mf.getD1Database("DB");
		for (const sql of ((await readFile("migrations/d1/0001_initial.sql", "utf8")) + (await readFile("migrations/d1/0002_verificacion_correo.sql", "utf8")))
			.split(";")
			.map((s) => s.trim())
			.filter(Boolean))
			await db.prepare(sql).run();
		const health = await mf.dispatchFetch("http://localhost/api/healt");
		expect(health.status).toBe(200);
		const form = new FormData();
		for (const [k, v] of Object.entries({
			nombres: "Prueba",
			apellidos: "Worker",
			email: "worker@gmail.com",
			departamento: "Cerro Largo",
			fecha_nacimiento: "1990-01-01",
			genero: "otro",
			password: "Password123",
		}))
			form.set(k, v);
		form.set("turnstileToken", "register");
		const upload = new Request("http://localhost/api/auth/register", {
			method: "POST",
			headers: { origin: "http://localhost:5173" },
			body: form,
		});
		const r = await mf.dispatchFetch(upload.url, {
			method: "POST",
			headers: Object.fromEntries(upload.headers),
			body: new Uint8Array(await upload.arrayBuffer()),
		});
		expect(r.status, await r.clone().text()).toBe(201);
		expect(r.headers.get("set-cookie")).toBeNull();
		expect(await db.prepare("SELECT email_verificado FROM usuario WHERE email=?").bind("worker@gmail.com").first("email_verificado")).toBe(0);

		const organizer = new FormData();
		for (const [k, v] of Object.entries({
			nombreOrganizacion: "Prueba Worker",
			departamento: "Cerro Largo",
			email: "org.worker@gmail.com",
			telefono: "099123456",
			password: "Password123",
			aceptaTerminos: "si",
			aceptaPrivacidad: "si",
			versionDocumentos: "2026-10-28-v1",
		}))
			organizer.set(k, v);
		const image = new Blob([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")], {
			type: "image/png",
		});
		organizer.set("turnstileToken", "register-organizador");
		organizer.set("fotoCedulaFrente", image, "test.png");
		organizer.set("fotoCedulaDorso", image, "test.png");
		const registration = new Request("http://localhost/api/auth/register-organizador", {
			method: "POST",
			headers: { origin: "http://localhost:5173" },
			body: organizer,
		});
		const result = await mf.dispatchFetch(registration.url, {
			method: "POST",
			headers: Object.fromEntries(registration.headers),
			body: new Uint8Array(await registration.arrayBuffer()),
		});
		expect(result.status, await result.clone().text()).toBe(201);
		expect(uploads).toBe(2);
		expect(await db.prepare("SELECT count(*) AS n FROM documento_organizador").first("n")).toBe(2);
	} finally {
		await mf.dispose();
	}
});
