import { Hono } from "hono";
import { createHash, randomBytes } from "node:crypto";
import { hash } from "../../services/password.js";
import { correoSchema, resetSchema } from "./recuperacion.schema.js";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { correoConfigurado, enviarRecuperacion, origenRecuperacion } from "./correo.js";
import { background, current } from "../../configuracion/runtime.js";
import { verificarTurnstile } from "../../middleware/Turnstile.js";
const app = new Hono();
const respuesta = {
	message:
		"Si el correo corresponde a una cuenta con contraseña, recibirás un enlace para recuperarla.",
};
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
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
app.post("/solicitar", verificarTurnstile("recuperar-contrasena", "json"), async (c) => {
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
		background(
			procesar(datos.data.email)
				.catch(() =>
					console.error("Falló una entrega de recuperación; revisar el servicio de correo."),
				)
				.finally(() => {
					pendientes--;
				}),
		);
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
	const db = current().bindings.DB;
	const table = solicitud.id_usuario ? "usuario" : "organizador";
	const fk = solicitud.id_usuario ? "id_usuario" : "id_organizador";
	const id = solicitud.id_usuario ?? solicitud.id_organizador!;
	const results = await db.batch([
		db
			.prepare(
				"UPDATE " +
					table +
					" SET passhash=? WHERE id=? AND EXISTS (SELECT 1 FROM solicitud_recuperacion WHERE id=? AND usado=0 AND (CASE WHEN typeof(fecha_expiracion) IN ('integer','real') THEN fecha_expiracion ELSE (julianday(fecha_expiracion)-2440587.5)*86400000 END)>?)",
			)
			.bind(passhash, id, solicitud.id, Date.now()),
		db
			.prepare(
				"UPDATE solicitud_recuperacion SET usado=1 WHERE " +
					fk +
					"=? AND usado=0 AND EXISTS (SELECT 1 FROM " +
					table +
					" WHERE id=? AND passhash=?)",
			)
			.bind(id, id, passhash),
	]);
	if (results[0]!.meta.changes !== 1)
		throw new BadRequestError("El enlace es inválido o venció. Solicitá uno nuevo.");
	return c.json({ message: "Contraseña actualizada. Ingresá nuevamente con tu nueva contraseña." });
});
export { app as RecuperacionRoute };
