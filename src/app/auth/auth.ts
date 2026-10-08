// src/app/auth/auth.ts
import { hash, verify } from "@node-rs/argon2";
import { type Context, Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { BadRequestError, UnauthorizedError } from "../../configuracion/AppError.js";
import { prisma } from "../../configuracion/db.js";
import { env } from "../../configuracion/env.js";
import { ArchivosOrg } from "../../middleware/Archivos.js";
import { Google } from "../../middleware/Google.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import {
	auth_organizador_register_scheem,
	auth_usuario_login_scheem,
	auth_usuario_register_scheem,
} from "./auth.schema.js";

const app = new Hono();

// Login
app.post("/login", bodyLimitado(32, "KB"), async (c: Context) => {
	const body = await c.req.parseBody();

	// Verificar el formulario
	const datos = auth_usuario_login_scheem.safeParse(body);
	if (!datos.success) {
		throw new BadRequestError();
	}

	// Buscar usuario
	const usuario = await prisma.usuario.findUnique({
		where: { email: datos.data.email },
		select: {
			id: true,
			passhash: true,
			rol: true,
		},
	});

	// Buscar organizador
	const organizador = await prisma.organizador.findUnique({
		where: { email: datos.data.email },
		select: {
			id: true,
			passhash: true,
		},
	});

	const cuenta = usuario ?? organizador;

	if (!cuenta?.passhash) {
		throw new BadRequestError();
	}

	// Verificar la password
	const check = await verify(cuenta.passhash, datos.data.password);

	if (!check) {
		throw new BadRequestError();
	}

	const tipo = usuario ? "usuario" : "organizador";

	// Cookie para guardar la sesion
	await setSignedCookie(
		c,
		"session",
		`${tipo}:${cuenta.id}:${usuario?.rol ?? "ORGANIZADOR"}`,
		env.COOKIE_SECRET,
		{
			httpOnly: true,
			secure: env.NODE_ENV === "production",
			sameSite: "Lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		},
	);

	return c.json({ message: "Exito", tipo, rol: usuario?.rol ?? "ORGANIZADOR" }, 200);
});

// Registro del usuario
app.post("/register", bodyLimitado(64, "KB"), async (c: Context) => {
	const body = await c.req.parseBody();

	// Verificar el formulario
	const datos = auth_usuario_register_scheem.safeParse(body);
	if (!datos.success) {
		throw new BadRequestError();
	}

	// Si el usuario ya existe
	const duplicado = await prisma.usuario.findUnique({
		where: { email: datos.data.email },
	});

	if (duplicado) {
		throw new BadRequestError();
	}

	// Separar la password y fecha
	const { password, fecha_nacimiento, ...datosUsuario } = datos.data;

	// Crear el hash de la password
	const passhash = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		parallelism: 1,
	});

	// Crear el usuario
	const usuario = await prisma.usuario.create({
		data: {
			...datosUsuario,
			fecha_nacimiento: new Date(`${fecha_nacimiento}T00:00:00.000Z`),
			passhash,
		},
	});

	// Cookie para guardar la sesion
	await setSignedCookie(c, "session", `usuario:${usuario.id}:${usuario.rol}`, env.COOKIE_SECRET, {
		httpOnly: true,
		secure: env.NODE_ENV === "production",
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.json({ message: "Exito" }, 201);
});

// registro
app.post("/register-organizador", bodyLimitado(20, "MB"), ArchivosOrg, async (c: Context) => {
	const body = await c.req.parseBody();

	// Verificar el formulario
	const datos = auth_organizador_register_scheem.safeParse(body);
	if (!datos.success) {
		throw new BadRequestError();
	}

	// Si el organizador ya existe
	const duplicado = await prisma.organizador.findUnique({
		where: { email: datos.data.email },
	});

	if (duplicado) {
		throw new BadRequestError();
	}

	const frente = c.get("fotoCedulaFrente");
	const dorso = c.get("fotoCedulaDorso");

	// Crear el hash de la password
	const passhash = await hash(datos.data.password, {
		memoryCost: 19456,
		timeCost: 2,
		parallelism: 1,
	});

	// Crear el organizador
	const organizador = await prisma.organizador.create({
		data: {
			email: datos.data.email,
			nombre_organizacion: datos.data.nombreOrganizacion,
			rut_ruc: datos.data.rut,
			departamento: datos.data.departamento,
			telefono: datos.data.telefono,
			passhash,

			documentos: {
				create: [
					{
						tipo: "CEDULA_FRENTE",
						uri: `privado/${frente}`,
					},
					{
						tipo: "CEDULA_DORSO",
						uri: `privado/${dorso}`,
					},
				],
			},
		},
	});

	// Cookie para guardar la sesion
	await setSignedCookie(
		c,
		"session",
		`organizador:${organizador.id}:ORGANIZADOR`,
		env.COOKIE_SECRET,
		{
			httpOnly: true,
			secure: env.NODE_ENV === "production",
			sameSite: "Lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		},
	);

	return c.json({ message: "Exito" }, 201);
});

// login-register mediante google
app.get("/google", Google(), async (c: Context) => {
	const google = c.get("user-google");

	if (!google?.email || !google.id || !google.verified_email) {
		throw new BadRequestError();
	}

	let usuario = await prisma.usuario.findUnique({ where: { email: google.email } });

	if (usuario?.sub && usuario.sub !== google.id) {
		throw new BadRequestError();
	}

	if (!usuario) {
		usuario = await prisma.usuario.create({
			data: {
				nombres: google.given_name ?? google.name ?? "",
				apellidos: google.family_name ?? "",
				email: google.email,
				sub: google.id,
			},
		});
	} else if (!usuario.sub) {
		usuario = await prisma.usuario.update({ where: { id: usuario.id }, data: { sub: google.id } });
	}

	await setSignedCookie(c, "session", `usuario:${usuario.id}:${usuario.rol}`, env.COOKIE_SECRET, {
		httpOnly: true,
		secure: env.NODE_ENV === "production",
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.redirect("http://localhost:5173/turista");
});

// verificar session
app.get("/check", async (c: Context) => {
	const sesion = await getSignedCookie(c, env.COOKIE_SECRET, "session");

	if (!sesion) {
		throw new UnauthorizedError();
	}

	const [tipo, id] = sesion.split(":");

	if (tipo === "organizador") {
		const organizador = await prisma.organizador.findUnique({
			where: { id: Number(id) },
			select: { id: true, nombre_organizacion: true },
		});

		if (!organizador) {
			throw new UnauthorizedError();
		}

		return c.json({
			id: organizador.id,
			rol: "ORGANIZADOR",
			nombre: organizador.nombre_organizacion,
		});
	}

	const usuario = await prisma.usuario.findUnique({
		where: { id: Number(id) },
		select: { id: true, nombres: true, rol: true },
	});

	if (!usuario) {
		throw new UnauthorizedError();
	}

	return c.json({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombres });
});

// cerrar session ambos metodos
// https://hono.dev/docs/api/routing
app.on(["GET", "POST"], "/logout", async (c: Context) => {
	deleteCookie(c, "session", { path: "/" });
	return c.json({ message: "Exito" }, 200);
});

export { app as AuthRoute };
