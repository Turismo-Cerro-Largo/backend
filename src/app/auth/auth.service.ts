import { correoEnUso } from "../shared/correo-en-uso.js";
import * as usuarioRepository from "../usuarios/usuarios.repository.js";
import * as organizadorRepository from "../organizadores/organizadores.repository.js";
import { admitirIntento } from "./recuperacion.service.js";
import { hash, verify } from "@node-rs/argon2";
import { unlink } from "node:fs/promises";
import path from "node:path";
import {
	BadRequestError,
	ConflictError,
	CuentaBloqueadaError,
	UnauthorizedError,
} from "../../configuracion/AppError.js";
import {
	auth_organizador_register_scheem,
	auth_usuario_login_scheem,
	auth_usuario_register_scheem,
} from "./auth.schema.js";
import { emitirCodigoRegistro } from "./verificacion.service.js";
import { correoConfigurado } from "./correo.js";

export async function iniciarSesion(body: unknown) {
	// Verificar el formulario
	const datos = auth_usuario_login_scheem.safeParse(body);
	if (datos.success && !admitirIntento("login:" + datos.data.email.toLowerCase(), 20))
		return {
			datos: { message: "Demasiados intentos. Esperá unos minutos." },
			status: 429 as const,
		};
	if (!datos.success) {
		throw new BadRequestError();
	}

	// Buscar usuario
	const usuario = await usuarioRepository.findUnique({
		where: { email: datos.data.email },
		select: {
			id: true,
			passhash: true,
			rol: true,
			email_verificado: true,
			estado_acceso: true,
		},
	});

	// Buscar organizador
	const organizador = await organizadorRepository.findUnique({
		where: { email: datos.data.email },
		select: {
			id: true,
			passhash: true,
			email_verificado: true,
			estado_acceso: true,
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
	if (cuenta.estado_acceso === "BLOQUEADO") throw new CuentaBloqueadaError();
	if (!cuenta.email_verificado) {
		return {
			datos: {
				message: "Primero debés verificar tu correo electrónico.",
			},
			status: 403 as const,
		};
	}

	const tipo = usuario ? "usuario" : "organizador";

	// Cookie para guardar la sesion
	const rol = usuario?.rol ?? "ORGANIZADOR";

	return {
		datos: { message: "Exito", tipo, rol },
		status: 200 as const,
		cuenta: { tipo, id: cuenta.id, rol },
	};
}

export async function registrarTurista(body: unknown) {
	// Verificar el formulario
	const datos = auth_usuario_register_scheem.safeParse(body);
	if (!datos.success) {
		throw new BadRequestError();
	}
	if (!correoConfigurado()) {
		return {
			datos: {
				message: "El servicio de correo no está configurado.",
			},
			status: 503 as const,
		};
	}

	if (
		!admitirIntento(`registro:${datos.data.email}`, 3) ||
		!admitirIntento("registros-global", 100)
	) {
		return {
			datos: {
				message: "Demasiados intentos de registro.",
			},
			status: 429 as const,
		};
	}

	if (await correoEnUso(datos.data.email))
		throw new ConflictError("Ese correo ya está registrado.");

	// Separar la password y fecha
	const { password, fecha_nacimiento, ...datosUsuario } = datos.data;

	// Crear el hash de la password
	const passhash = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		parallelism: 1,
	});

	// Crear el usuario
	const usuario = await usuarioRepository.create({
		data: {
			email_verificado: false,
			...datosUsuario,
			fecha_nacimiento: new Date(`${fecha_nacimiento}T00:00:00.000Z`),
			passhash,
		},
	});

	let enviado = true;

	try {
		await emitirCodigoRegistro(usuario.email, "TURISTA");
	} catch {
		enviado = false;
		console.error("Falló el correo de registro del turista.");
	}

	return {
		datos: {
			message: enviado
				? "Te enviamos un código de verificación."
				: "Cuenta creada. Solicitá el reenvío del código.",
			enviado,
		},
		status: 201 as const,
	};
}

export async function registrarOrganizador(body: unknown, frente: string, dorso: string) {
	let organizador;

	try {
		const datos = auth_organizador_register_scheem.safeParse(body);

		if (!datos.success) throw new BadRequestError();
		if (!correoConfigurado()) {
			return {
				datos: {
					message: "El servicio de correo no está configurado.",
				},
				status: 503 as const,
			};
		}

		if (
			!admitirIntento(`registro:${datos.data.email}`, 3) ||
			!admitirIntento("registros-global", 100)
		) {
			return {
				datos: {
					message: "Demasiados intentos de registro.",
				},
				status: 429 as const,
			};
		}

		if (await correoEnUso(datos.data.email))
			throw new ConflictError("Ese correo ya está registrado.");

		organizador = await organizadorRepository.create({
			data: {
				email: datos.data.email,
				email_verificado: false,
				estado: "PENDIENTE_REVISION",
				nombre_organizacion: datos.data.nombreOrganizacion,
				rut_ruc: datos.data.rut,
				departamento: datos.data.departamento,
				telefono: datos.data.telefono,
				acepta_terminos: true,
				acepta_privacidad: true,
				version_documentos: datos.data.versionDocumentos,
				aceptado_en: new Date(),
				passhash: await hash(datos.data.password, {
					memoryCost: 19456,
					timeCost: 2,
					parallelism: 1,
				}),
				documentos: {
					create: [
						{ tipo: "CEDULA_FRENTE", uri: frente },
						{ tipo: "CEDULA_DORSO", uri: dorso },
					],
				},
			},
		});
	} catch (e) {
		await Promise.all(
			[frente, dorso].map((nombre) =>
				unlink(path.join(process.cwd(), "privados", nombre)).catch(() => undefined),
			),
		);

		if ((e as { code?: string }).code === "P2002")
			throw new ConflictError("Ese correo o RUT ya está registrado.");

		throw e;
	}

	let enviado = true;

	try {
		await emitirCodigoRegistro(organizador.email, "ORGANIZADOR");
	} catch {
		enviado = false;
		console.error("Falló el correo de registro del organizador.");
	}

	return {
		datos: {
			message: enviado
				? "Verificá tu correo para continuar."
				: "Solicitud creada. Solicitá otro código.",
			enviado,
		},
		status: 201 as const,
	};
}

export async function iniciarConGoogle(
	google:
		| {
				email?: string;
				id?: string;
				verified_email?: boolean;
				given_name?: string;
				name?: string;
				family_name?: string;
		  }
		| undefined,
) {
	if (!google?.email || !google.id || !google.verified_email) {
		throw new BadRequestError();
	}

	let usuario = await usuarioRepository.findUnique({ where: { email: google.email } });

	if (usuario?.sub && usuario.sub !== google.id) {
		throw new BadRequestError();
	}

	if (usuario?.estado_acceso === "BLOQUEADO") throw new CuentaBloqueadaError();
	if (usuario?.estado_acceso === "ELIMINADO") throw new UnauthorizedError();

	if (!usuario) {
		if (await organizadorRepository.findUnique({ where: { email: google.email } }))
			throw new ConflictError("Ese correo pertenece a un organizador.");
		usuario = await usuarioRepository.create({
			data: {
				nombres: google.given_name ?? google.name ?? "",
				apellidos: google.family_name ?? "",
				email: google.email,
				sub: google.id,
				email_verificado: true,
			},
		});
	} else if (!usuario.sub || !usuario.email_verificado) {
		usuario = await usuarioRepository.update({
			where: { id: usuario.id },
			data: { sub: google.id, email_verificado: true },
		});
	}

	return { tipo: "usuario", id: usuario.id, rol: usuario.rol };
}

export async function consultarSesion({ tipo, id }: { tipo: string; id: string }) {
	if (tipo === "organizador") {
		const organizador = await organizadorRepository.findUnique({
			where: { id: Number(id) },
			select: { id: true, nombre_organizacion: true, estado: true },
		});

		if (!organizador) {
			throw new UnauthorizedError();
		}

		return {
			id: organizador.id,
			rol: "ORGANIZADOR",
			nombre: organizador.nombre_organizacion,
			estado: organizador.estado,
		};
	}

	const usuario = await usuarioRepository.findUnique({
		where: { id: Number(id) },
		select: { id: true, nombres: true, rol: true, foto_perfil: true },
	});

	if (!usuario) {
		throw new UnauthorizedError();
	}

	return {
		id: usuario.id,
		rol: usuario.rol,
		nombre: usuario.nombres,
		foto:
			usuario.rol === "TURISTA" && usuario.foto_perfil
				? `/api/turista/foto?v=${encodeURIComponent(usuario.foto_perfil)}`
				: null,
	};
}
