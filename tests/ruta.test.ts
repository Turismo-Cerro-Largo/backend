import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/configuracion/db.js";

const aislada=process.env.TURISTA_TEST_DB===process.env.DATABASE_NAME && /^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME||"");
describe.skipIf(!aislada)("auth", () => {
	const marca=randomUUID().slice(0,8);
	const emailOrganizador = `org.${marca}@gmail.com`;
	const emailUsuario = `usr.${marca}@gmail.com`;

	beforeAll(async () => {
		await prisma.$connect();

		await prisma.organizador.deleteMany({
			where: { email: emailOrganizador },
		});

		await prisma.usuario.deleteMany({
			where: { email: emailUsuario },
		});
	}, 15000);

	afterAll(async () => {
        const docs=await prisma.documentoOrganizador.findMany({where:{organizador:{email:emailOrganizador}},select:{uri:true}});
        await Promise.all(docs.map(d=>unlink(path.join('privados',d.uri)).catch(()=>undefined)));
		await prisma.organizador.deleteMany({
			where: { email: emailOrganizador },
		});

		await prisma.usuario.deleteMany({
			where: { email: emailUsuario },
		});

		await prisma.$disconnect();
	}, 15000);

	it("crear organizador", async () => {
		const form = new FormData();

		form.append("email", emailOrganizador);
		form.append("password", "PruebaSegura2026");
		form.append("rut", String(parseInt(marca,16)).padStart(12,"0"));
		form.append("departamento", "Cerro Largo");
		form.append("nombreOrganizacion", "Turismo Cerro Largo");
		form.append("telefono", "099123456");

		form.append(
			"fotoCedulaFrente",
			new File([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0])], "frente.jpg", { type: "image/jpeg" }),
		);

		form.append("fotoCedulaDorso", new File([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0])], "dorso.jpg", { type: "image/jpeg" }));

		const res = await app.request("/api/auth/register-organizador", {
			method: "POST",
            headers: {origin:(process.env.APP_ORIGINS||"http://localhost:5173").split(",")[0]!},
			body: form,
		});

		expect(res.status).toBe(201);

		const data = await res.json();

		expect(data.message).toBe("Exito");

		const organizador = await prisma.organizador.findUnique({
			where: { email: emailOrganizador },
			include: {
				documentos: true,
			},
		});

		expect(organizador).not.toBeNull();
		expect(organizador?.email).toBe(emailOrganizador);
		expect(organizador?.nombre_organizacion).toBe("Turismo Cerro Largo");
		expect(organizador?.rut_ruc).toBe(String(parseInt(marca,16)).padStart(12,"0"));
		expect(organizador?.telefono).toBe("099123456");

		expect(organizador?.passhash).not.toBe("PruebaSegura2026");

		expect(organizador?.documentos).toHaveLength(2);

		expect(organizador?.documentos.some((documento) => documento.tipo === "CEDULA_FRENTE")).toBe(
			true,
		);

		expect(organizador?.documentos.some((documento) => documento.tipo === "CEDULA_DORSO")).toBe(
			true,
		);

		expect(organizador?.documentos.every((documento) => /^[a-f0-9-]+\.jpg$/.test(documento.uri))).toBe(
			true,
		);
	}, 15000);

	it("error organizador duplicado", async () => {
		const form = new FormData();

		form.append("email", emailOrganizador);
		form.append("password", "PruebaSegura2026");
		form.append("rut", String(parseInt(marca,16)).padStart(12,"0"));
		form.append("departamento", "Cerro Largo");
		form.append("nombreOrganizacion", "Turismo Cerro Largo");
		form.append("telefono", "099123456");

		form.append(
			"fotoCedulaFrente",
			new File([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0])], "frente.jpg", { type: "image/jpeg" }),
		);

		form.append("fotoCedulaDorso", new File([new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0])], "dorso.jpg", { type: "image/jpeg" }));

		const res = await app.request("/api/auth/register-organizador", {
			method: "POST",
            headers: {origin:(process.env.APP_ORIGINS||"http://localhost:5173").split(",")[0]!},
			body: form,
		});

		expect(res.status).toBe(409);
	}, 15000);

	it("crear turista", async () => {
		const form = new FormData();

		form.append("nombres", "Juan");
		form.append("apellidos", "Perez");
		form.append("email", emailUsuario);
		form.append("departamento", "Cerro Largo");
		form.append("localidad", "Melo");
		form.append("fecha_nacimiento", "2000-01-01");
		form.append("telefono", "099111222");
		form.append("genero", "masculino");
		form.append("cedula", "45678901");
		form.append("password", "PruebaSegura2026");

		const res = await app.request("/api/auth/register", {
			method: "POST",
            headers: {origin:(process.env.APP_ORIGINS||"http://localhost:5173").split(",")[0]!},
			body: form,
		});

		expect(res.status).toBe(201);

		const data = await res.json();

		expect(data.message).toBe("Exito");

		const usuario = await prisma.usuario.findUnique({
			where: { email: emailUsuario },
		});

		expect(usuario).not.toBeNull();
		expect(usuario?.email).toBe(emailUsuario);
		expect(usuario?.nombres).toBe("Juan");
		expect(usuario?.apellidos).toBe("Perez");
		expect(usuario?.passhash).not.toBe("PruebaSegura2026");
	}, 15000);

	it("login turista", async () => {
		const form = new FormData();

		form.append("email", emailUsuario);
		form.append("password", "PruebaSegura2026");

		const res = await app.request("/api/auth/login", {
			method: "POST",
            headers: {origin:(process.env.APP_ORIGINS||"http://localhost:5173").split(",")[0]!},
			body: form,
		});

		expect(res.status).toBe(200);

		const data = await res.json();

		expect(data.message).toBe("Exito");

		const cookie = res.headers.get("set-cookie");

		expect(cookie).toContain("session=");
	}, 15000);

	it("login organizador", async () => {
		const form = new FormData();

		form.append("email", emailOrganizador);
		form.append("password", "PruebaSegura2026");

		const res = await app.request("/api/auth/login", {
			method: "POST",
            headers: {origin:(process.env.APP_ORIGINS||"http://localhost:5173").split(",")[0]!},
			body: form,
		});

		expect(res.status).toBe(200);

		const data = await res.json();

		expect(data.message).toBe("Exito");

		const cookie = res.headers.get("set-cookie");

		expect(cookie).toContain("session=");
	}, 15000);
});
