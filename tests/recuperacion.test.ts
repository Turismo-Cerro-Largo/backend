import "dotenv/config";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import { hash, verify } from "@node-rs/argon2";
import { Hono } from "hono";
import { app } from "../src/app.js";
import { prisma } from "../src/configuracion/db.js";
import { crear_sesion } from "../src/middleware/Session.js";
import { correoConfigurado } from "../src/app/auth/correo.js";

const aislada =
	process.env.TURISTA_TEST_DB === process.env.DATABASE_NAME &&
	/^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || "");
describe.skipIf(!aislada)("recuperación y seguridad", () => {
	const marca = randomUUID().slice(0, 8),
		email = `reset.${marca}@gmail.com`,
		orgEmail = `orgreset.${marca}@gmail.com`;
	const origin = (process.env.APP_ORIGINS || "http://localhost:5173").split(",")[0]!;
	const nuevo = "NuevaClaveSegura2026";
	let id: number, orgId: number, googleId: number, adminId: number, cookie: string, token: string;
	const archivos: string[] = [];
	const req = (ruta: string, body: unknown, origen = origin) =>
		app.request("/api/auth/recuperacion/" + ruta, {
			method: "POST",
			headers: { "content-type": "application/json", origin: origen },
			body: JSON.stringify(body),
		});
	const digest = (s: string) => createHash("sha256").update(s).digest("hex");
	async function sesion(id: number, tipo = "usuario") {
		const helper = new Hono();
		helper.get("/", async (c) => {
			await crear_sesion(c, { id, tipo, rol: "TURISTA" });
			return c.text("ok");
		});
		return (await helper.request("/")).headers.get("set-cookie")!.split(";")[0]!;
	}
	async function correo(para: string) {
		for (let i = 0; i < 100; i++) {
			for (const nombre of await readdir(".local-mail").catch(() => [])) {
				const data = JSON.parse(await readFile(".local-mail/" + nombre, "utf8"));
				if (data.to === para) {
					if (!archivos.includes(nombre)) archivos.push(nombre);
					return data;
				}
			}
			await new Promise((r) => setTimeout(r, 20));
		}
		throw new Error("No llegó el correo local de prueba");
	}
	beforeAll(async () => {
		process.env.MAIL_MODE = "local";
		const passhash = await hash("AnteriorSegura2026");
		id = (
			await prisma.usuario.create({
				data: { email, nombres: "Recuperacion", apellidos: "Prueba", passhash },
			})
		).id;
		orgId = (
			await prisma.organizador.create({
				data: {
					email: orgEmail,
					nombre_organizacion: "Prueba",
					rut_ruc: "reset-" + marca,
					telefono: "099123456",
					passhash,
				},
			})
		).id;
		googleId = (
			await prisma.usuario.create({
				data: {
					email: `google.${marca}@gmail.com`,
					nombres: "Google",
					apellidos: "Prueba",
					sub: marca,
				},
			})
		).id;
		adminId = (
			await prisma.usuario.create({
				data: {
					email: `adminreset.${marca}@gmail.com`,
					nombres: "Admin",
					apellidos: "Prueba",
					rol: "ADMINISTRADOR",
				},
			})
		).id;
		cookie = await sesion(id);
	});
	afterAll(async () => {
		await prisma.usuario.deleteMany({
			where: { id: { in: [id, googleId, adminId].filter(Boolean) } },
		});
		if (orgId) await prisma.organizador.delete({ where: { id: orgId } });
		await Promise.all(archivos.map((n) => unlink(".local-mail/" + n).catch(() => undefined)));
		await prisma.$disconnect();
	});
	it("respuesta genérica para cuentas existentes y ausentes; token solo en el correo", async () => {
		const real = await req("solicitar", { email }),
			ausente = await req("solicitar", { email: `ausente.${marca}@gmail.com` });
		expect(real.status).toBe(202);
		expect(await real.json()).toEqual(await ausente.json());
		const mail = await correo(email);
		token = mail.text.match(/#token=([a-f0-9]{64})/)[1];
		const stored = await prisma.solicitudRecuperacion.findUnique({
			where: { token: digest(token) },
		});
		expect(stored?.id_usuario).toBe(id);
		expect(stored?.token).not.toBe(token);
	});
	it("rechaza origen ajeno, JSON inválido y claves débiles", async () => {
		expect((await req("solicitar", { email }, "https://ajeno.invalid")).status).toBe(403);
		expect((await req("solicitar", { email: "no-es-correo" })).status).toBe(400);
		expect((await req("confirmar", { token, password: "a" })).status).toBe(400);
		expect((await req("confirmar", { token: "x".repeat(64), password: nuevo })).status).toBe(400);
	});
	it("rechaza vencidos sin cambiar la contraseña", async () => {
		const expirado = randomBytes(32).toString("hex");
		await prisma.solicitudRecuperacion.create({
			data: {
				token: digest(expirado),
				id_usuario: id,
				fecha_expiracion: new Date(Date.now() - 1000),
			},
		});
		expect((await req("confirmar", { token: expirado, password: nuevo })).status).toBe(400);
		expect(
			await verify(
				(await prisma.usuario.findUniqueOrThrow({ where: { id } })).passhash!,
				"AnteriorSegura2026",
			),
		).toBe(true);
	});
	it("consume una sola vez incluso con confirmaciones simultáneas y revoca sesiones", async () => {
		expect((await app.request("/api/auth/check", { headers: { cookie } })).status).toBe(200);
		const res = await Promise.all([
			req("confirmar", { token, password: nuevo }),
			req("confirmar", { token, password: nuevo }),
		]);
		expect(res.map((r) => r.status).sort()).toEqual([200, 400]);
		expect((await app.request("/api/auth/check", { headers: { cookie } })).status).toBe(401);
		expect((await app.request("/api/turista/perfil", { headers: { cookie } })).status).toBe(401);
		expect((await req("confirmar", { token, password: nuevo })).status).toBe(400);
	});
	it("permite ingresar con la nueva contraseña y rechaza la anterior", async () => {
		for (const [password, status] of [
			[nuevo, 200],
			["AnteriorSegura2026", 400],
		] as const) {
			const form = new FormData();
			form.set("email", email);
			form.set("password", password);
			expect(
				(await app.request("/api/auth/login", { method: "POST", headers: { origin }, body: form }))
					.status,
			).toBe(status);
		}
	});
	it("recupera también cuentas de organizador", async () => {
		await req("solicitar", { email: orgEmail });
		const mail = await correo(orgEmail),
			tokenOrg = mail.text.match(/#token=([a-f0-9]{64})/)[1];
		expect((await req("confirmar", { token: tokenOrg, password: nuevo })).status).toBe(200);
		expect(
			await verify(
				(await prisma.organizador.findUniqueOrThrow({ where: { id: orgId } })).passhash,
				nuevo,
			),
		).toBe(true);
	});
	it("no convierte cuentas exclusivas de Google a contraseña", async () => {
		const r = await req("solicitar", { email: `google.${marca}@gmail.com` });
		expect(r.status).toBe(202);
		await new Promise((r) => setTimeout(r, 100));
		expect(await prisma.solicitudRecuperacion.count({ where: { id_usuario: googleId } })).toBe(0);
	});
	it("consulta el rol actual y bloquea a un administrador degradado", async () => {
		const cookie = await sesion(adminId);
		await prisma.usuario.update({ where: { id: adminId }, data: { rol: "TURISTA" } });
		expect((await app.request("/api/admin/usuarios", { headers: { cookie } })).status).toBe(403);
	});
	it("no expone contraseñas ni permite buzón local en producción", async () => {
		const r = await app.request("/api/auth/check", { headers: { cookie: await sesion(id) } });
		expect(JSON.stringify(await r.json())).not.toContain("passhash");
		const anterior = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			expect(correoConfigurado()).toBe(false);
		} finally {
			process.env.NODE_ENV = anterior;
		}
	});
	it("rechaza cookies antiguas y logout por GET", async () => {
		expect(
			(
				await app.request("/api/auth/check", {
					headers: { cookie: "session=usuario:1:ADMINISTRADOR" },
				})
			).status,
		).toBe(401);
		expect((await app.request("/api/auth/logout")).status).toBe(404);
	});
	it("no expone eventos ocultos ni su contenido por el catálogo integrado", async () => {
		expect((await app.request("/api/eventos?offset=-1")).status).toBe(400);
		expect((await app.request("/api/archivos/privados/no-existe.jpg")).status).toBe(401);
		expect((await app.request("/api/archivos/publicos/no-existe.jpg")).status).toBe(404);
	});
	it("rechaza un archivo disfrazado de imagen en el registro del organizador", async () => {
		const form = new FormData();
		form.set("email", `upload.${marca}@gmail.com`);
		form.set("password", "PruebaSegura2026");
		form.set("nombreOrganizacion", "Prueba");
		form.set("rut", "123456789012");
		form.set("departamento", "Cerro Largo");
		form.set("telefono", "099123456");
		form.set(
			"fotoCedulaFrente",
			new File(["<script>alert(1)</script>"], "frente.jpg", { type: "image/jpeg" }),
		);
		form.set(
			"fotoCedulaDorso",
			new File(["<script>alert(1)</script>"], "dorso.jpg", { type: "image/jpeg" }),
		);
		expect(
			(
				await app.request("/api/auth/register-organizador", {
					method: "POST",
					headers: { origin },
					body: form,
				})
			).status,
		).toBe(400);
		expect(await prisma.organizador.count({ where: { email: `upload.${marca}@gmail.com` } })).toBe(
			0,
		);
	});
});
