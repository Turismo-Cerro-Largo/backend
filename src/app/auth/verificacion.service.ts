import * as verificacionCorreoRepository from "./verificacion.datos.repository.js";
import * as transacciones from "./verificacion.repository.js";
import * as usuarioRepository from "../usuarios/usuarios.repository.js";
import * as organizadorRepository from "../organizadores/organizadores.repository.js";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../../configuracion/env.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { admitirIntento } from "./recuperacion.service.js";
import { correoConfigurado, enviarCodigoRegistro } from "./correo.js";

type Tipo = "TURISTA" | "ORGANIZADOR";

const datosSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(254),
});

const confirmarSchema = datosSchema.extend({
	codigo: z.string().regex(/^\d{6}$/),
});

const DURACION = 15 * 60 * 1000;

function firma(email: string, tipo: Tipo, codigo: string) {
	return createHmac("sha256", env.COOKIE_SECRET).update(`${tipo}:${email}:${codigo}`).digest("hex");
}

export async function emitirCodigoRegistro(email: string, tipo: Tipo) {
	if (!correoConfigurado()) {
		throw new Error("Correo no configurado.");
	}

	const codigo = String(randomInt(0, 1000000)).padStart(6, "0");
	const anterior = await verificacionCorreoRepository.findUnique({ where: { email } });
	const codigoHash = firma(email, tipo, codigo);

	await verificacionCorreoRepository.upsert({
		where: { email },
		update: {
			tipo,
			codigo_hash: codigoHash,
			expira_en: new Date(Date.now() + DURACION),
			enviado_en: new Date(),
			intentos: 0,
		},
		create: {
			email,
			tipo,
			codigo_hash: codigoHash,
			expira_en: new Date(Date.now() + DURACION),
		},
	});

	try {
		await enviarCodigoRegistro(email, codigo);
	} catch (error) {
		if (anterior) {
			await verificacionCorreoRepository.updateMany({
				where: { email, codigo_hash: codigoHash },
				data: { tipo: anterior.tipo, codigo_hash: anterior.codigo_hash, expira_en: anterior.expira_en, intentos: anterior.intentos },
			});
		} else {
			await verificacionCorreoRepository.deleteMany({ where: { email, codigo_hash: codigoHash } });
		}
		const detalle = error as { code?: string; responseCode?: number; command?: string; message?: string };
		console.error("Falló el envío del código de registro", {
			code: detalle.code,
			responseCode: detalle.responseCode,
			command: detalle.command,
			conexion: detalle.code === "ESOCKET" ? detalle.message?.replace(/[\w.+-]+@[\w.-]+/g, "[correo]").slice(0, 250) : undefined,
		});
		throw error;
	}
}

export async function confirmar(json: unknown) {
	const datos = confirmarSchema.safeParse(json);

	if (!datos.success) {
		throw new BadRequestError("Revisá el correo y el código.");
	}

	const { email, codigo } = datos.data;

	// Limitar intentos.
	if (!admitirIntento(`codigo:${email}`, 12) || !admitirIntento("codigos-global", 300)) {
		return {
			datos: {
				message: "Demasiados intentos. Esperá unos minutos.",
			},
			status: 429 as const,
		};
	}

	// Buscar el código en la base de datos.
	const registro = await verificacionCorreoRepository.findUnique({
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
		await verificacionCorreoRepository.updateMany({
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

	// Código correcto: confirmar la cuenta.
	await transacciones.consumirCodigo(registro, calculada, email, tipo);

	// NUEVO: Devolver también el tipo de cuenta.
	return {
		datos: {
			message:
				tipo === "ORGANIZADOR"
					? "Correo verificado. Esperá la aprobación del administrador."
					: "Correo verificado. Ya podés iniciar sesión.",
			tipo,
		},
		status: 200 as const,
	};
}

export async function reenviar(json: unknown) {
	const datos = datosSchema.safeParse(json);

	if (!datos.success) {
		throw new BadRequestError("Datos incorrectos.");
	}

	// NUEVO: El frontend envía solamente el correo.
	const { email } = datos.data;

	// Limitar solicitudes de reenvío.
	if (!admitirIntento(`reenvio:${email}`, 3) || !admitirIntento("reenvios-global", 100)) {
		return {
			datos: {
				message: "Demasiadas solicitudes. Intentá más tarde.",
			},
			status: 429 as const,
		};
	}

	if (!correoConfigurado()) {
		return {
			datos: {
				message: "El servicio de correo no está disponible.",
			},
			status: 503 as const,
		};
	}

	const respuesta = {
		message:
			"Si la cuenta está pendiente y se cumplen los límites de reenvío, recibirás otro código.",
	};

	// NUEVO: Buscar el correo en ambas tablas.
	const [usuario, organizador] = await Promise.all([
		usuarioRepository.findUnique({
			where: { email },
			select: {
				email_verificado: true,
			},
		}),
		organizadorRepository.findUnique({
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
		return { datos: respuesta, status: 202 as const };
	}

	// NUEVO: Determinar el tipo automáticamente.
	const tipo: Tipo = pendienteTurista ? "TURISTA" : "ORGANIZADOR";

	// Comprobar cuándo se envió el último código.
	const anterior = await verificacionCorreoRepository.findUnique({
		where: { email },
	});

	// Permitir como máximo un envío por minuto.
	if (anterior && Date.now() - anterior.enviado_en.getTime() < 60000) {
		return { datos: respuesta, status: 202 as const };
	}

	// Enviar un nuevo código.
	try {
		await emitirCodigoRegistro(email, tipo);
	} catch {
		console.error("No se pudo enviar un código de registro.");

		return {
			datos: {
				message: "No se pudo enviar el correo. Intentá más tarde.",
			},
			status: 503 as const,
		};
	}

	return { datos: respuesta, status: 202 as const };
}
