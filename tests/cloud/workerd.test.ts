import { it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { readFile, readdir, mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
it("ejecuta el bundle completo en workerd y registra una cuenta en D1", async () => {
	await mkdir(".wrangler", { recursive: true });
	const dir = await mkdtemp(path.resolve(".wrangler/workerd-"));
	const mf = new Miniflare({
		modules: [
			{ type: "ESModule", path: path.resolve("dist/index.js") },
			...(await readdir("dist"))
				.filter((f) => f.endsWith(".wasm"))
				.map((f) => ({ type: "CompiledWasm" as const, path: path.resolve("dist", f) })),
		],
		compatibilityDate: "2026-07-01",
		compatibilityFlags: ["nodejs_compat"],
		d1Databases: ["DB"],
		r2Buckets: ["FILES"],
		d1Persist: path.join(dir, "d1"),
		r2Persist: path.join(dir, "r2"),
		bindings: {
			COOKIE_SECRET: "workerd-test-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklm",
			NODE_ENV: "development",
			APP_PUBLIC_URL: "http://localhost:5173",
			APP_ORIGINS: "http://localhost:5173",
		},
	});
	try {
		const db = await mf.getD1Database("DB");
		for (const sql of (await readFile("migrations/d1/0001_initial.sql", "utf8"))
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
		const cookie = r.headers.get("set-cookie")!.split(";")[0]!;
		const check = await mf.dispatchFetch("http://localhost/api/auth/check", {
			headers: { cookie },
		});
		expect(check.status, await check.clone().text()).toBe(200);
		expect(((await check.json()) as any).rol).toBe("TURISTA");
		expect(
			(await mf.dispatchFetch("http://localhost/api/admin/organizadores", { headers: { cookie } }))
				.status,
		).toBe(403);
	} finally {
		await mf.dispose();
	}
});
