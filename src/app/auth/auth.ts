import { origenRecuperacion } from "./correo.js";
import { RecuperacionRoute, admitirIntento } from "./recuperacion.js";
// src/app/auth/auth.ts
import { hash, verify } from "@node-rs/argon2";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { type Context, Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { BadRequestError, ConflictError, UnauthorizedError } from "../../configuracion/AppError.js";
import { prisma } from "../../configuracion/db.js";
import { env } from "../../configuracion/env.js";
import { ArchivosPrivados } from "../../middleware/Archivos.js";
import { Google } from "../../middleware/Google.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import {
	auth_organizador_register_scheem,
	auth_usuario_login_scheem,
	auth_usuario_register_scheem,
} from "./auth.schema.js";
import { crear_sesion, leerSesion } from "../../middleware/Session.js";

const app = new Hono();
app.route("/recuperacion", RecuperacionRoute);
async function correoEnUso(email: string) {
	const [usuario, organizador] = await Promise.all([
		prisma.usuario.findUnique({ where: { email }, select: { id: true } }),
		prisma.organizador.findUnique({ where: { email }, select: { id: true } })
	]);
	return Boolean(usuario || organizador);
}

// Login
app.post("/login", bodyLimitado(32, "KB"), async (c: Context) => {
	const body = await c.req.parseBody();

	// Verificar el formulario
	const datos = auth_usuario_login_scheem.safeParse(body);
    if (!admitirIntento('login-global',500) || (datos.success && !admitirIntento('login:'+datos.data.email.toLowerCase(),20))) return c.json({message:'Demasiados intentos. Esperá unos minutos.'},429);
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
	await crear_sesion(c, { tipo, id: cuenta.id, rol: usuario?.rol ?? "ORGANIZADOR" });

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

	if (await correoEnUso(datos.data.email)) throw new ConflictError("Ese correo ya está registrado.");

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
	await crear_sesion(c, { tipo: "usuario", id: usuario.id, rol: usuario.rol });

	return c.json({ message: "Exito" }, 201);
});

// registro
app.post("/register-organizador", bodyLimitado(20, "MB"), ArchivosPrivados(), async (c: Context) => {
	let organizador;

	try {
		const datos = auth_organizador_register_scheem.safeParse(await c.req.parseBody());

		if (!datos.success) throw new BadRequestError();

		if (await correoEnUso(datos.data.email)) throw new ConflictError("Ese correo ya está registrado.");

		organizador = await prisma.organizador.create({
			data: {
				email: datos.data.email,
				nombre_organizacion: datos.data.nombreOrganizacion,
				rut_ruc: datos.data.rut,
				departamento: datos.data.departamento,
				telefono: datos.data.telefono,
				passhash: await hash(datos.data.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
				documentos: {
					create: [
						{ tipo: "CEDULA_FRENTE", uri: c.get("fotoCedulaFrente") },
						{ tipo: "CEDULA_DORSO", uri: c.get("fotoCedulaDorso") },
					],
				},
			},
		});
	} catch (e) {
		await Promise.all([c.get("fotoCedulaFrente"), c.get("fotoCedulaDorso")].map((nombre) => unlink(path.join(process.cwd(), "privados", nombre)).catch(() => undefined)));

		if ((e as { code?: string }).code === "P2002") throw new ConflictError("Ese correo o RUT ya está registrado.");

		throw e;
	}

	await crear_sesion(c, { tipo: "organizador", id: organizador.id, rol: "ORGANIZADOR" });

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
		if (await prisma.organizador.findUnique({ where: { email: google.email } })) throw new ConflictError("Ese correo pertenece a un organizador.");
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

	await crear_sesion(c, { tipo: "usuario", id: usuario.id, rol: usuario.rol });

	return c.redirect(origenRecuperacion() + "/");
});

// verificar session
app.get("/check", async (c: Context) => {
	const { tipo, id } = await leerSesion(c);
	c.header("Cache-Control", "private, no-store");

	if (tipo === "organizador") {
		const organizador = await prisma.organizador.findUnique({
			where: { id: Number(id) },
			select: { id: true, nombre_organizacion: true, estado: true },
		});

		if (!organizador) {
			throw new UnauthorizedError();
		}

		return c.json({
			id: organizador.id,
			rol: "ORGANIZADOR",
			nombre: organizador.nombre_organizacion,
			estado: organizador.estado,
		});
	}

	const usuario = await prisma.usuario.findUnique({
		where: { id: Number(id) },
		select: { id: true, nombres: true, rol: true, foto_perfil: true },
	});

	if (!usuario) {
		throw new UnauthorizedError();
	}

	c.header("Cache-Control", "private, no-store");
	return c.json({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombres,
        foto: usuario.rol === "TURISTA" && usuario.foto_perfil ? `/api/turista/foto?v=${encodeURIComponent(usuario.foto_perfil)}` : null });
});

// cerrar session ambos metodos
// https://hono.dev/docs/api/routing
app.on(["POST"], "/logout", async (c: Context) => {
	deleteCookie(c, "session", { path: "/" });
	return c.json({ message: "Exito" }, 200);
});

export { app as AuthRoute };
