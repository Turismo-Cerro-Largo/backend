import { Hono } from "hono";
import { createHash, randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { correoConfigurado, enviarRecuperacion, origenRecuperacion } from "./correo.js";
const app = new Hono();
const respuesta = {
	message:
		"Si el correo corresponde a una cuenta con contraseña, recibirás un enlace para recuperarla.",
};
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
const correoSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();
const resetSchema = z
	.object({
		token: z.string().regex(/^[a-f0-9]{64}$/),
		password: z
			.string()
			.min(8)
			.max(32)
			.regex(/^(?=.*[a-z])(?=.*[A-Z]).*$/),
	})
	.strict();
// Límites por proceso; varias instancias requieren limitación compartida en el proxy.
const intentos = new Map<string, { n: number; hasta: number }>();
export function admitirIntento(clave: string, limite: number, ventana = 15 * 60 * 1000) {
	const ahora = Date.now();
	for (const [k, v] of intentos) if (v.hasta <= ahora) intentos.delete(k);
	const k = digest(clave),
		entrada = intentos.get(k);
	if (entrada) {
		if (entrada.n >= limite) return false;
		entrada.n++;
		return true;
	}
	if (intentos.size >= 10000) return false;
	intentos.set(k, { n: 1, hasta: ahora + ventana });
	return true;
}
let pendientes = 0;
// SMTP fuera de la respuesta HTTP evita revelar existencia por su latencia.
async function procesar(email: string) {
	const [usuario, org] = await Promise.all([
		prisma.usuario.findUnique({ where: { email }, select: { id: true, passhash: true } }),
		prisma.organizador.findUnique({ where: { email }, select: { id: true, passhash: true } }),
	]);
	if ((usuario && org) || !(usuario?.passhash || org?.passhash)) return;
	const token = randomBytes(32).toString("hex");
	const solicitud = await prisma.solicitudRecuperacion.create({
		data: {
			token: digest(token),
			fecha_expiracion: new Date(Date.now() + 20 * 60 * 1000),
			...(usuario ? { id_usuario: usuario.id } : { id_organizador: org!.id }),
		},
	});
	try {
		await enviarRecuperacion(email, token);
	} catch {
		await prisma.solicitudRecuperacion.update({
			where: { id: solicitud.id },
			data: { usado: true },
		});
		throw new Error("No se pudo entregar un correo de recuperación.");
	}
}
app.use("*", bodyLimitado(4, "KB"));
app.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	c.header("Referrer-Policy", "no-referrer");
	await next();
});
app.post("/solicitar", async (c) => {
	const datos = correoSchema.safeParse(await c.req.json().catch(() => null));
	if (!datos.success) throw new BadRequestError("Ingresá un correo válido.");
	if (!correoConfigurado())
		return c.json(
			{ message: "La recuperación por correo aún no está configurada. Contactá al equipo." },
			503,
		);
	origenRecuperacion();
	const permitido =
		admitirIntento("correo:" + datos.data.email, 3) && admitirIntento("envios-global", 100);
	if (permitido && pendientes < 10) {
		pendientes++;
		void procesar(datos.data.email)
			.catch(() =>
				console.error("Falló una entrega de recuperación; revisar el servicio de correo."),
			)
			.finally(() => {
				pendientes--;
			});
	}
	return c.json(respuesta, 202);
});
app.post("/confirmar", async (c) => {
	const datos = resetSchema.safeParse(await c.req.json().catch(() => null));
	if (!datos.success)
		throw new BadRequestError(
			"Revisá el enlace y usá entre 8 y 32 caracteres, con mayúscula y minúscula.",
		);
	if (
		!admitirIntento("confirmaciones-global", 100) ||
		!admitirIntento("token:" + datos.data.token, 5)
	)
		return c.json({ message: "Demasiados intentos. Esperá unos minutos." }, 429);
	const token = digest(datos.data.token);
	const solicitud = await prisma.solicitudRecuperacion.findUnique({ where: { token } });
	if (
		!solicitud ||
		solicitud.usado ||
		solicitud.fecha_expiracion <= new Date() ||
		Boolean(solicitud.id_usuario) === Boolean(solicitud.id_organizador)
	)
		throw new BadRequestError("El enlace es inválido o venció. Solicitá uno nuevo.");
	const passhash = await hash(datos.data.password, {
		memoryCost: 19456,
		timeCost: 2,
		parallelism: 1,
	});
	await prisma.$transaction(async (tx) => {
		const cuenta = solicitud.id_usuario
			? { id_usuario: solicitud.id_usuario }
			: { id_organizador: solicitud.id_organizador! };
		// Orden de bloqueos estable para dos recuperaciones concurrentes.
		if (solicitud.id_usuario)
			await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${solicitud.id_usuario} FOR UPDATE`;
		else
			await tx.$queryRaw`SELECT id FROM organizador WHERE id = ${solicitud.id_organizador} FOR UPDATE`;
		const consumido = await tx.solicitudRecuperacion.updateMany({
			where: { id: solicitud.id, usado: false, fecha_expiracion: { gt: new Date() } },
			data: { usado: true },
		});
		if (consumido.count !== 1)
			throw new BadRequestError("El enlace es inválido o venció. Solicitá uno nuevo.");
		if (solicitud.id_usuario)
			await tx.usuario.update({ where: { id: solicitud.id_usuario }, data: { passhash } });
		else
			await tx.organizador.update({ where: { id: solicitud.id_organizador! }, data: { passhash } });
		await tx.solicitudRecuperacion.updateMany({
			where: { ...cuenta, usado: false },
			data: { usado: true },
		});
	});
	return c.json({ message: "Contraseña actualizada. Ingresá nuevamente con tu nueva contraseña." });
});
export { app as RecuperacionRoute };
