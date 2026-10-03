import { Context, Hono } from "hono";
import {
	auth_organizador_register_scheem,
	auth_usuario_login_scheem,
	auth_usuario_register_scheem,
} from "./auth.schema.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { prisma } from "../../configuracion/db.js";
import { hash, verify } from "@node-rs/argon2";
import { setSignedCookie } from "hono/cookie";
import { ArchivosOrg } from "../../middleware/Archivos.js";

const app = new Hono();

// Login
app.post("/login", async (c: Context) => {
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

	if (!cuenta || !cuenta.passhash) {
		throw new BadRequestError();
	}

	// Verificar la password
	const check = await verify(cuenta.passhash, datos.data.password);

	if (!check) {
		throw new BadRequestError();
	}

	const tipo = usuario ? "usuario" : "organizador";

	// Cookie para guardar la sesion
	await setSignedCookie(c, "session", `${tipo}:${cuenta.id}`, process.env.COOKIE_SECRET!, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.json({ message: "Exito" }, 200);
});

// Registro del usuario
app.post("/register", async (c: Context) => {
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
	await setSignedCookie(c, "session", `usuario:${usuario.id}`, process.env.COOKIE_SECRET!, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.json({ message: "Exito" }, 201);
});

// Registro del organizador
app.post("/register-organizador", ArchivosOrg, async (c: Context) => {
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
	const usuario = await prisma.organizador.create({
		data: {
			email: datos.data.email,
			nombre_organizacion: datos.data.nombreOrganizacion,
			rut_ruc: datos.data.rut,
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
	await setSignedCookie(c, "session", `organizador:${usuario.id}`, process.env.COOKIE_SECRET!, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	return c.json({ message: "Exito" }, 201);
});

export { app as AuthRoute };
