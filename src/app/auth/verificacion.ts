import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";

import { batch } from "../../configuracion/d1.js";
import { prisma } from "../../configuracion/db.js";
import { env } from "../../configuracion/env.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { admitirIntento } from "./recuperacion.js";
import { correoConfigurado, enviarCodigoRegistro } from "./correo.js";

const app = new Hono();

type Tipo = "TURISTA" | "ORGANIZADOR";

const datosSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(254),
});

const confirmarSchema = datosSchema.extend({
	codigo: z.string().regex(/^\d{6}$/),
});

// El código dura 15 minutos.
const DURACION = 15 * 60 * 1000;

// Protege el código utilizando HMAC-SHA256.
function firma(email: string, tipo: Tipo, codigo: string) {
	return createHmac("sha256", env.COOKIE_SECRET).update(`${tipo}:${email}:${codigo}`).digest("hex");
}

// Genera y envía un código de seis dígitos.
export async function emitirCodigoRegistro(email: string, tipo: Tipo) {
	if (!correoConfigurado()) {
		throw new Error("Correo no configurado.");
	}

	const codigo = String(randomInt(0, 1000000)).padStart(6, "0");

	await prisma.verificacionCorreo.upsert({
		where: { email },
		update: {
			tipo,
			codigo_hash: firma(email, tipo, codigo),
			expira_en: new Date(Date.now() + DURACION),
			enviado_en: new Date(),
			intentos: 0,
		},
		create: {
			email,
			tipo,
			codigo_hash: firma(email, tipo, codigo),
			expira_en: new Date(Date.now() + DURACION),
		},
	});

	await enviarCodigoRegistro(email, codigo);
}

app.use("*", bodyLimitado(4, "KB"));

app.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	await next();
});

// ==========================================
// CONFIRMAR CÓDIGO DE VERIFICACIÓN
// POST /api/auth/verificacion/confirmar
// ==========================================

app.post("/confirmar", async (c) => {
	const datos = confirmarSchema.safeParse(await c.req.json().catch(() => null));

	if (!datos.success) {
		throw new BadRequestError("Revisá el correo y el código.");
	}

	const { email, codigo } = datos.data;

	// Limitar intentos.
	if (!admitirIntento(`codigo:${email}`, 12) || !admitirIntento("codigos-global", 300)) {
		return c.json(
			{
				message: "Demasiados intentos. Esperá unos minutos.",
			},
			429,
		);
	}

	// Buscar el código en la base de datos.
	const registro = await prisma.verificacionCorreo.findUnique({
		where: { email },
	});

	// Verificar vencimiento y cantidad de intentos.
	if (!registro || registro.expira_en <= new Date() || registro.intentos >= 5) {
		throw new BadRequestError("El código venció o no es válido. Solicitá otro.");
	}

	// NUEVO: Obtener el tipo real desde MySQL.
	// El usuario no puede elegir ni modificar su rol.
	const tipo: Tipo = registro.tipo;

	const calculada = firma(email, tipo, codigo);

	const coincide = timingSafeEqual(
		Buffer.from(registro.codigo_hash, "hex"),
		Buffer.from(calculada, "hex"),
	);

	// Código incorrecto.
	if (!coincide) {
		await prisma.verificacionCorreo.updateMany({
			where: {
				id: registro.id,
				codigo_hash: registro.codigo_hash,
				intentos: { lt: 5 },
			},
			data: {
				intentos: { increment: 1 },
			},
		});

		throw new BadRequestError("Código incorrecto.");
	}

	const tabla = tipo === "TURISTA" ? "usuario" : "organizador";
	const [actualizado] = await batch([
		{
			sql: `UPDATE ${tabla} SET email_verificado=1 WHERE email=? AND email_verificado=0 AND EXISTS (
                SELECT 1 FROM verificacion_correo WHERE id=? AND codigo_hash=? AND intentos<5
                AND (CASE WHEN typeof(expira_en) IN ('integer','real') THEN expira_en ELSE (julianday(expira_en)-2440587.5)*86400000 END)>?
            )`,
			values: [email, registro.id, calculada, Date.now()],
		},
		{
			sql: "DELETE FROM verificacion_correo WHERE id=? AND codigo_hash=? AND changes()=1",
			values: [registro.id, calculada],
		},
	]);
	if (actualizado?.meta.changes !== 1) {
		throw new BadRequestError("El código venció o ya fue utilizado.");
	}

	// NUEVO: Devolver también el tipo de cuenta.
	return c.json({
		message:
			tipo === "ORGANIZADOR"
				? "Correo verificado. Esperá la aprobación del administrador."
				: "Correo verificado. Ya podés iniciar sesión.",
		tipo,
	});
});

// ==========================================
// REENVIAR CÓDIGO DE VERIFICACIÓN
// POST /api/auth/verificacion/reenviar
// ==========================================

app.post("/reenviar", async (c) => {
	const datos = datosSchema.safeParse(await c.req.json().catch(() => null));

	if (!datos.success) {
		throw new BadRequestError("Datos incorrectos.");
	}

	// NUEVO: El frontend envía solamente el correo.
	const { email } = datos.data;

	// Limitar solicitudes de reenvío.
	if (!admitirIntento(`reenvio:${email}`, 3) || !admitirIntento("reenvios-global", 100)) {
		return c.json(
			{
				message: "Demasiadas solicitudes. Intentá más tarde.",
			},
			429,
		);
	}

	if (!correoConfigurado()) {
		return c.json(
			{
				message: "El servicio de correo no está disponible.",
			},
			503,
		);
	}

	const respuesta = {
		message:
			"Si la cuenta está pendiente y se cumplen los límites de reenvío, recibirás otro código.",
	};

	// NUEVO: Buscar el correo en ambas tablas.
	const [usuario, organizador] = await Promise.all([
		prisma.usuario.findUnique({
			where: { email },
			select: {
				email_verificado: true,
			},
		}),
		prisma.organizador.findUnique({
			where: { email },
			select: {
				email_verificado: true,
			},
		}),
	]);

	// Detectar qué cuenta está pendiente.
	const pendienteTurista = usuario?.email_verificado === false;

	const pendienteOrganizador = organizador?.email_verificado === false;

	// No revelar si un correo está registrado.
	// No continuar si existen cuentas ambiguas.
	if ((usuario && organizador) || pendienteTurista === pendienteOrganizador) {
		return c.json(respuesta, 202);
	}

	// NUEVO: Determinar el tipo automáticamente.
	const tipo: Tipo = pendienteTurista ? "TURISTA" : "ORGANIZADOR";

	// Comprobar cuándo se envió el último código.
	const anterior = await prisma.verificacionCorreo.findUnique({
		where: { email },
	});

	// Permitir como máximo un envío por minuto.
	if (anterior && Date.now() - anterior.enviado_en.getTime() < 60000) {
		return c.json(respuesta, 202);
	}

	// Enviar un nuevo código.
	try {
		await emitirCodigoRegistro(email, tipo);
	} catch {
		console.error("No se pudo enviar un código de registro.");

		return c.json(
			{
				message: "No se pudo enviar el correo. Intentá más tarde.",
			},
			503,
		);
	}

	return c.json(respuesta, 202);
});

export { app as VerificacionRoute };
