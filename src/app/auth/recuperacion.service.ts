import * as usuarioRepository from "../usuarios/usuarios.repository.js";
import * as organizadorRepository from "../organizadores/organizadores.repository.js";
import * as solicitudRecuperacionRepository from "./recuperacion.datos.repository.js";
import * as transacciones from "./recuperacion.repository.js";
import { createHash, randomBytes } from "node:crypto";
import { hash } from "../../services/password.service.js";
import { correoSchema, resetSchema } from "./recuperacion.schema.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { correoConfigurado, enviarRecuperacion, origenRecuperacion } from "./correo.js";

const respuesta = {
	message:
		"Si el correo corresponde a una cuenta con contraseña, recibirás un enlace para recuperarla.",
};

const digest = (v: string) => createHash("sha256").update(v).digest("hex");

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

async function procesar(email: string) {
	const [usuario, org] = await Promise.all([
		usuarioRepository.findUnique({
			where: { email },
			select: { id: true, passhash: true, estado_acceso: true },
		}),
		organizadorRepository.findUnique({
			where: { email },
			select: { id: true, passhash: true, estado_acceso: true },
		}),
	]);
	const cuenta = usuario ?? org;
	if ((usuario && org) || !cuenta?.passhash || cuenta.estado_acceso !== "ACTIVO") return;
	const token = randomBytes(32).toString("hex");
	const solicitud = await solicitudRecuperacionRepository.create({
		data: {
			token: digest(token),
			fecha_expiracion: new Date(Date.now() + 20 * 60 * 1000),
			...(usuario ? { id_usuario: usuario.id } : { id_organizador: org!.id }),
		},
	});
	try {
		await enviarRecuperacion(email, token);
	} catch {
		await solicitudRecuperacionRepository.update({
			where: { id: solicitud.id },
			data: { usado: true },
		});
		throw new Error("No se pudo entregar un correo de recuperación.");
	}
}

export async function solicitar(json: unknown) {
	const datos = correoSchema.safeParse(json);
	if (!datos.success) throw new BadRequestError("Ingresá un correo válido.");
	if (!correoConfigurado())
		return {
			datos: { message: "La recuperación por correo aún no está configurada. Contactá al equipo." },
			status: 503 as const,
		};
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
	return { datos: respuesta, status: 202 as const };
}

export async function confirmar(json: unknown) {
	const datos = resetSchema.safeParse(json);
	if (!datos.success)
		throw new BadRequestError(
			"Revisá el enlace y usá entre 8 y 32 caracteres, con mayúscula y minúscula.",
		);
	if (
		!admitirIntento("confirmaciones-global", 100) ||
		!admitirIntento("token:" + datos.data.token, 5)
	)
		return {
			datos: { message: "Demasiados intentos. Esperá unos minutos." },
			status: 429 as const,
		};
	const token = digest(datos.data.token);
	const solicitud = await solicitudRecuperacionRepository.findUnique({ where: { token } });
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
	await transacciones.restablecerClave(solicitud, passhash);
	return {
		datos: { message: "Contraseña actualizada. Ingresá nuevamente con tu nueva contraseña." },
		status: 200 as const,
	};
}
