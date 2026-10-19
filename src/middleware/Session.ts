import { createHmac, timingSafeEqual } from "node:crypto";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { env } from "../configuracion/env.js";
import { prisma } from "../configuracion/db.js";
import { ForbiddenError, UnauthorizedError } from "../configuracion/AppError.js";
const duracion = 7 * 24 * 60 * 60;
const firmaPassword = (hash: string | null) =>
	createHmac("sha256", env.COOKIE_SECRET)
		.update(hash || "google-only")
		.digest("hex");
async function cuentaActual(tipo: string, id: number) {
	if (tipo === "usuario")
		return prisma.usuario.findUnique({
			where: { id },
			select: { id: true, rol: true, passhash: true },
		});
	if (tipo === "organizador") {
		const org = await prisma.organizador.findUnique({
			where: { id },
			select: { id: true, passhash: true, estado: true },
		});
		return org ? { ...org, rol: "ORGANIZADOR" } : null;
	}
	return null;
}
// Cambiar la contraseña revoca todas las sesiones anteriores; el rol se consulta en la base.
export async function crear_sesion(c: Context, cuenta: { tipo: string; id: number; rol: string }) {
	const actual = await cuentaActual(cuenta.tipo, cuenta.id);
	if (!actual) throw new UnauthorizedError();
	const vencimiento = Math.floor(Date.now() / 1000) + duracion;
	return setSignedCookie(
		c,
		"session",
		`${cuenta.tipo}:${cuenta.id}:${actual.rol}:${vencimiento}:${firmaPassword(actual.passhash)}`,
		env.COOKIE_SECRET,
		{
			httpOnly: true,
			secure: env.NODE_ENV === "production",
			sameSite: "Lax",
			path: "/",
			maxAge: duracion,
		},
	);
}
export async function leerSesion(c: Context) {
	const cookie = await getSignedCookie(c, env.COOKIE_SECRET, "session");
	if (!cookie) throw new UnauthorizedError();
	const partes = cookie.split(":");
	const [tipo, id, _rol, exp, sello] = partes;
	const n = Number(id),
		vencimiento = Number(exp);
	if (
		partes.length !== 5 ||
		!Number.isSafeInteger(n) ||
		n < 1 ||
		!Number.isSafeInteger(vencimiento) ||
		vencimiento <= Date.now() / 1000 ||
		!sello ||
		!/^[a-f0-9]{64}$/.test(sello)
	)
		throw new UnauthorizedError();
	const cuenta = await cuentaActual(tipo!, n);
	if (!cuenta || !timingSafeEqual(Buffer.from(sello), Buffer.from(firmaPassword(cuenta.passhash))))
		throw new UnauthorizedError();
	return { tipo: tipo!, id: id!, rol: cuenta.rol };
}
type Variables = { sesion: { tipo: string; id: string; rol: string } };
export const VerificarSession = createMiddleware<{ Variables: Variables }>(async (c, next) => {
	c.set("sesion", await leerSesion(c));
	await next();
});
export const VerificarSessionRol = (roles: string[]) =>
	createMiddleware<{ Variables: Variables }>(async (c, next) => {
		const sesion = await leerSesion(c);
		if (!roles.includes(sesion.rol)) throw new ForbiddenError();
		c.set("sesion", sesion);
		await next();
	});
export const VerificarSessionRolVerificada = (roles: string[]) =>
	createMiddleware<{ Variables: Variables }>(async (c, next) => {
		const sesion = await leerSesion(c);
		if (!roles.includes(sesion.rol)) throw new ForbiddenError();
		if (
			sesion.tipo === "organizador" &&
			!(await prisma.organizador.findFirst({
				where: { id: Number(sesion.id), estado: "APROBADO" },
				select: { id: true },
			}))
		)
			throw new ForbiddenError();
		c.set("sesion", sesion);
		await next();
	});

declare module "hono" {
	interface ContextVariableMap {
		sesion: Variables["sesion"];
	}
}
