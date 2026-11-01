import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
import { Miniflare } from "miniflare";
import { readFile } from "node:fs/promises";
import { hash as nativeHash, verify as nativeVerify } from "@node-rs/argon2";
import { hash, verify } from "../../src/services/password.js";
import worker from "../../src/index.js";
import type { Bindings } from "../../src/configuracion/runtime.js";
let mf: Miniflare, bindings: Bindings;
const pending: Promise<unknown>[] = [];
const ctx = {
	waitUntil(p: Promise<unknown>) {
		pending.push(p);
	},
	passThroughOnException() {},
} as ExecutionContext;
const origin = "http://localhost:5173";
let cookie = "";
async function request(route: string, options: RequestInit = {}) {
	const headers = new Headers(options.headers);
	if (options.method && options.method !== "GET") headers.set("Origin", origin);
	if (cookie) headers.set("cookie", cookie);
	return worker.fetch(
		new Request("http://localhost:4000/api" + route, { ...options, headers }),
		bindings,
		ctx,
	);
}
const png = () =>
	new File([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")], "documento.png", {
		type: "image/png",
	});
beforeAll(async () => {
	await mkdir(".wrangler", { recursive: true });
	const dir = await mkdtemp(path.resolve(".wrangler/test-"));
	mf = new Miniflare({
		r2Persist: path.join(dir, "r2"),
		d1Persist: path.join(dir, "d1"),
		modules: true,
		script: 'export default {fetch(){return new Response("ok")}}',
		compatibilityDate: "2026-07-01",
		d1Databases: ["DB"],
		r2Buckets: ["FILES"],
	});
	const db = await mf.getD1Database("DB");
	const bucket = await mf.getR2Bucket("FILES");
	bindings = {
		DB: db as unknown as D1Database,
		FILES: bucket as unknown as R2Bucket,
		COOKIE_SECRET: "test-cookie-secret-64-characters-abcdefghijklmnopqrstuvwxyz123456789",
		NODE_ENV: "development",
		APP_PUBLIC_URL: origin,
		APP_ORIGINS: origin,
	};
	const sql = await readFile("migrations/d1/0001_initial.sql", "utf8");
	for (const statement of sql
		.split(";")
		.map((s) => s.trim())
		.filter(Boolean))
		await db.prepare(statement).run();
});
afterAll(async () => {
	await Promise.allSettled(pending);
	await mf?.dispose();
});
describe("Worker + D1 + R2", () => {
	it("mantiene compatibilidad de hashes Argon2id existentes", async () => {
		const h = await nativeHash("Password123", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
		expect(await verify(h, "Password123")).toBe(true);
		expect(await verify(h, "Incorrecta")).toBe(false);
		const nuevo = await hash("Password123");
		expect(await nativeVerify(nuevo, "Password123")).toBe(true);
	});
	it("arranca sin MySQL, responde health y bloquea rutas privadas", async () => {
		expect((await request("/healt")).status).toBe(200);
		expect((await request("/admin/organizadores")).status).toBe(401);
		expect((await request("/turista/perfil")).status).toBe(401);
	});
	it("registra organizadores con documentos R2 y rechaza registros incompletos", async () => {
		const bad = new FormData();
		bad.set("email", "org@gmail.com");
		expect(
			(await request("/auth/register-organizador", { method: "POST", body: bad })).status,
		).toBe(400);
		const f = new FormData();
		for (const [k, v] of Object.entries({
			nombreOrganizacion: "Turismo Cerro Largo",
			departamento: "Cerro Largo",
			email: "org@gmail.com",
			telefono: "099123456",
			password: "Password123",
			aceptaTerminos: "si",
			aceptaPrivacidad: "si",
			versionDocumentos: "2026-10-28-v1",
		}))
			f.set(k, v);
		f.set("fotoCedulaFrente", png());
		f.set("fotoCedulaDorso", png());
		const response = await request("/auth/register-organizador", { method: "POST", body: f });
		expect(response.status, await response.clone().text()).toBe(201);
		cookie = response.headers.get("set-cookie")!.split(";")[0]!;
		const docs = await bindings.DB.prepare("SELECT uri FROM documento_organizador").all<{
			uri: string;
		}>();
		expect(docs.results).toHaveLength(2);
		const uri = docs.results[0]!.uri;
		expect(await bindings.FILES.head("privados/" + uri)).not.toBeNull();
		expect((await request("/archivos/privados/" + uri)).status).toBe(200);
		const own = cookie;
		cookie = "";
		expect((await request("/archivos/privados/" + uri)).status).toBe(401);
		cookie = own;
		expect((await request("/organizador/eventos")).status).toBe(403);
		const check = await request("/auth/check");
		expect(((await check.json()) as any).rol).toBe("ORGANIZADOR");
	});
	it("aísla bindings y secretos entre requests", async () => {
		const other = {
			...bindings,
			COOKIE_SECRET: "different-test-secret-abcdefghijklmnopqrstuvwxyz0123456789",
		};
		const r = await worker.fetch(
			new Request("http://localhost/api/auth/check", { headers: { cookie } }),
			other,
			ctx,
		);
		expect(r.status).toBe(401);
		expect((await request("/auth/check")).status).toBe(200);
	});
	it("consume un enlace de recuperación una sola vez en concurrencia", async () => {
		const crypto = await import("node:crypto");
		const token = "ab".repeat(32),
			digest = crypto.createHash("sha256").update(token).digest("hex");
		await bindings.DB.prepare(
			"INSERT INTO solicitud_recuperacion(token,fecha_expiracion,usado,id_organizador) VALUES(?,?,0,1)",
		)
			.bind(digest, new Date(Date.now() + 600000).toISOString())
			.run();
		const opts = () => ({
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token, password: "NuevaPassword123" }),
		});
		const responses = await Promise.all([
			request("/auth/recuperacion/confirmar", opts()),
			request("/auth/recuperacion/confirmar", opts()),
		]);
		expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
		expect((await request("/auth/check")).status).toBe(401);
		cookie = "";
	});
	it("sirve recursos R2 por rangos sin exponer borradores", async () => {
		const db = bindings.DB;
		await db.prepare("INSERT INTO categoria(nombre) VALUES(?)").bind("Naturaleza").run();
		await db
			.prepare(
				"INSERT INTO ubicacion(nombre,descripcion,localidad,latitud,longitud,estado,id_categoria) VALUES('Playa','Descripción','Melo',-32,-54,'PUBLICADO',1)",
			)
			.run();
		await db
			.prepare("INSERT INTO recurso(uri,tipo,id_ubicacion) VALUES('/publicos/test.mp4','VIDEO',1)")
			.run();
		await bindings.FILES.put("publicos/test.mp4", new Uint8Array([0, 1, 2, 3, 4, 5]), {
			httpMetadata: { contentType: "video/mp4" },
		});
		const r = await request("/recursos/1", { headers: { range: "bytes=1-3" } });
		expect(r.status).toBe(206);
		expect(r.headers.get("content-range")).toBe("bytes 1-3/6");
		expect(Array.from(new Uint8Array(await r.arrayBuffer()))).toEqual([1, 2, 3]);
		expect((await request("/recursos/1", { headers: { range: "bytes=99-100" } })).status).toBe(416);
		await db.prepare("UPDATE ubicacion SET estado='OCULTADO' WHERE id=1").run();
		expect((await request("/recursos/1")).status).toBe(404);
	});
	it("revierte un batch completo si falla una escritura", async () => {
		const db = bindings.DB;
		await expect(
			db.batch([
				db.prepare("INSERT INTO categoria(nombre) VALUES('Rollback')"),
				db.prepare("INSERT INTO categoria(nombre) VALUES('Naturaleza')"),
			]),
		).rejects.toThrow();
		expect(await db.prepare("SELECT id FROM categoria WHERE nombre='Rollback'").first()).toBeNull();
	});
	it("edita ubicaciones con recursos y renombra localidades atómicamente", async () => {
		const db = bindings.DB;
		const org = await db
			.prepare("SELECT passhash FROM organizador WHERE id=1")
			.first<{ passhash: string }>();
		await db
			.prepare(
				"INSERT INTO usuario(nombres,apellidos,email,passhash,rol,localidad) VALUES('Admin','Prueba','admin@gmail.com',?,'ADMINISTRADOR','Melo')",
			)
			.bind(org!.passhash)
			.run();
		const login = new FormData();
		login.set("email", "admin@gmail.com");
		login.set("password", "NuevaPassword123");
		const r = await request("/auth/login", { method: "POST", body: login });
		expect(r.status).toBe(200);
		cookie = r.headers.get("set-cookie")!.split(";")[0]!;
		const place = {
			nombre: "Plaza de prueba",
			descripcion: "Descripción de prueba",
			localidad: "Melo",
			latitud: -32.3,
			longitud: -54.2,
			estado: "PUBLICADO",
			id_categoria: 1,
			recursos: [{ uri: "/api/archivos/publicos/test.mp4", tipo: "VIDEO" }],
		};
		const created = await request("/admin/ubicaciones", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(place),
		});
		expect(created.status, await created.clone().text()).toBe(201);
		const id = ((await created.json()) as any).id;
		const changed = await request("/admin/ubicaciones/" + id, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ ...place, nombre: "Plaza actualizada" }),
		});
		expect(changed.status, await changed.clone().text()).toBe(200);
		expect(
			(await db
				.prepare("SELECT COUNT(*) AS n FROM recurso WHERE id_ubicacion=?")
				.bind(id)
				.first<{ n: number }>())!.n,
		).toBe(1);
		await db
			.prepare(
				"INSERT INTO localidad(slug,nombre,actualizado_en) VALUES('Melo','Melo',CURRENT_TIMESTAMP)",
			)
			.run();
		const f = new FormData();
		f.set("slug", "Melo");
		f.set("nombre", "Melo actualizado");
		const renamed = await request("/admin/localidades/1", { method: "PUT", body: f });
		expect(renamed.status, await renamed.clone().text()).toBe(200);
		expect(
			(await db
				.prepare("SELECT localidad FROM ubicacion WHERE id=?")
				.bind(id)
				.first<{ localidad: string }>())!.localidad,
		).toBe("Melo actualizado");
		expect(
			(await db
				.prepare("SELECT localidad FROM usuario WHERE email='admin@gmail.com'")
				.first<{ localidad: string }>())!.localidad,
		).toBe("Melo actualizado");
		cookie = "";
	});
	it("espera el correo en waitUntil y no guarda tokens en texto plano", async () => {
		const sent: { text: string }[] = [];
		bindings.MAIL_FROM = "no-reply@example.test";
		bindings.EMAIL = {
			send: async (message) => {
				sent.push(message);
			},
		};
		const r = await request("/auth/recuperacion/solicitar", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "org@gmail.com" }),
		});
		expect(r.status).toBe(202);
		await Promise.allSettled(pending);
		expect(sent).toHaveLength(1);
		const token = sent[0]!.text.match(/token=([a-f0-9]{64})/)![1];
		const saved = await bindings.DB.prepare(
			"SELECT token FROM solicitud_recuperacion ORDER BY id DESC LIMIT 1",
		).first<{ token: string }>();
		expect(saved!.token).not.toBe(token);
		expect(saved!.token).toHaveLength(64);
	});
});
