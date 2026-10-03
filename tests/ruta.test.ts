import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/configuracion/db.js";

describe("auth", () => {
	const emailOrganizador = "organizador@test.com";
	const emailUsuario = "usuario@test.com";

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
		form.append("password", "12345678");
		form.append("rut", "123456789012");
		form.append("nombreOrganizacion", "Turismo Cerro Largo");
		form.append("telefono", "099123456");

		form.append(
			"fotoCedulaFrente",
			new File(["cedula frente"], "frente.jpg", { type: "image/jpeg" }),
		);

		form.append("fotoCedulaDorso", new File(["cedula dorso"], "dorso.jpg", { type: "image/jpeg" }));

		const res = await app.request("/api/auth/register-organizador", {
			method: "POST",
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
		expect(organizador?.rut_ruc).toBe("123456789012");
		expect(organizador?.telefono).toBe("099123456");

		expect(organizador?.passhash).not.toBe("12345678");

		expect(organizador?.documentos).toHaveLength(2);

		expect(organizador?.documentos.some((documento) => documento.tipo === "CEDULA_FRENTE")).toBe(
			true,
		);

		expect(organizador?.documentos.some((documento) => documento.tipo === "CEDULA_DORSO")).toBe(
			true,
		);

		expect(organizador?.documentos.every((documento) => documento.uri.startsWith("privado/"))).toBe(
			true,
		);
	}, 15000);

	it("error organizador duplicado", async () => {
		const form = new FormData();

		form.append("email", emailOrganizador);
		form.append("password", "12345678");
		form.append("rut", "123456789012");
		form.append("nombreOrganizacion", "Turismo Cerro Largo");
		form.append("telefono", "099123456");

		form.append(
			"fotoCedulaFrente",
			new File(["cedula frente"], "frente.jpg", { type: "image/jpeg" }),
		);

		form.append("fotoCedulaDorso", new File(["cedula dorso"], "dorso.jpg", { type: "image/jpeg" }));

		const res = await app.request("/api/auth/register-organizador", {
			method: "POST",
			body: form,
		});

		expect(res.status).toBe(400);
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
		form.append("password", "12345678");

		const res = await app.request("/api/auth/register", {
			method: "POST",
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
		expect(usuario?.passhash).not.toBe("12345678");
	}, 15000);

	it("login turista", async () => {
		const form = new FormData();

		form.append("email", emailUsuario);
		form.append("password", "12345678");

		const res = await app.request("/api/auth/login", {
			method: "POST",
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
		form.append("password", "12345678");

		const res = await app.request("/api/auth/login", {
			method: "POST",
			body: form,
		});

		expect(res.status).toBe(200);

		const data = await res.json();

		expect(data.message).toBe("Exito");

		const cookie = res.headers.get("set-cookie");

		expect(cookie).toContain("session=");
	}, 15000);
});
