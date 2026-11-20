import * as usuarioRepository from "../usuarios/usuarios.repository.js";
import * as comentarioRepository from "./comentarios.repository.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../configuracion/AppError.js";
import type { EstadoComentario } from "../../configuracion/generated/prisma/enums.js";

const estados = ["PENDIENTE_REVISION", "PUBLICADO", "OCULTADO"] as const;

const esEstado = (value: unknown): value is EstadoComentario =>
	typeof value === "string" && estados.some((e) => e === value);

const idNumerico = (value: string) => {
	const n = Number(value);
	if (!Number.isSafeInteger(n) || n <= 0) throw new BadRequestError();
	return n;
};

const parametro = (v: string | undefined, base: number, max: number) => {
	if (v === undefined) return base;
	const n = Number(v);
	if (!Number.isSafeInteger(n) || n < 0 || n > max) throw new BadRequestError();
	return n;
};

const relaciones = {
	usuario: { select: { id: true, nombres: true, apellidos: true, email: true } },
	ubicacion: { select: { id: true, nombre: true, localidad: true } },
} as const;

export async function listar(query: Record<string, string | undefined>) {
	const estado = query.estado ?? "";
	const buscar = (query.buscar ?? "").trim();
	const ubicacionRaw = query.id_ubicacion;
	const idUbicacion = ubicacionRaw ? idNumerico(ubicacionRaw) : undefined;
	if ((estado && !esEstado(estado)) || buscar.length > 120) throw new BadRequestError();
	const offset = parametro(query.offset, 0, 1000000);
	const limit = Math.max(1, parametro(query.limit, 12, 50));
	const where = {
		...(estado ? { estado: estado as EstadoComentario } : {}),
		...(idUbicacion ? { id_ubicacion: idUbicacion } : {}),
		...(buscar
			? {
					OR: [
						{ texto: { contains: buscar } },
						{ usuario: { is: { nombres: { contains: buscar } } } },
						{ usuario: { is: { apellidos: { contains: buscar } } } },
						{ ubicacion: { is: { nombre: { contains: buscar } } } },
					],
				}
			: {}),
	};
	const [comentarios, total, pendientes, publicados, ocultados] = await Promise.all([
		comentarioRepository.findMany({
			where,
			skip: offset,
			take: limit,
			orderBy: { creado_en: "desc" },
			include: relaciones,
		}),
		comentarioRepository.count({ where }),
		comentarioRepository.count({
			where: {
				estado: "PENDIENTE_REVISION",
				...(idUbicacion ? { id_ubicacion: idUbicacion } : {}),
			},
		}),
		comentarioRepository.count({
			where: { estado: "PUBLICADO", ...(idUbicacion ? { id_ubicacion: idUbicacion } : {}) },
		}),
		comentarioRepository.count({
			where: { estado: "OCULTADO", ...(idUbicacion ? { id_ubicacion: idUbicacion } : {}) },
		}),
	]);
	return {
		comentarios,
		total,
		offset,
		limit,
		resumen: { pendientes, publicados, ocultados },
	};
}

export async function detalle(valorId: string) {
	const comentario = await comentarioRepository.findUnique({
		where: { id: idNumerico(valorId) },
		include: {
			...relaciones,
			recursos: { select: { uri: true, tipo: true, orden: true }, orderBy: { orden: "asc" } },
		},
	});
	if (!comentario) throw new NotFoundError();
	return comentario;
}

export async function cambiarEstado(valorId: string, json: unknown) {
	const id = idNumerico(valorId);
	const body: unknown = json;
	const estado = body && typeof body === "object" && "estado" in body ? body.estado : undefined;
	if (!esEstado(estado)) throw new BadRequestError();
	const existente = await comentarioRepository.findUnique({ where: { id }, select: { id: true } });
	if (!existente) throw new NotFoundError();
	const comentario = await comentarioRepository.update({
		where: { id },
		data: { estado },
		select: { id: true, estado: true },
	});
	return comentario;
}

export async function verificarCuenta(sesion: { id: string; tipo: string }) {
	const id = Number(sesion.id);
	if (sesion.tipo !== "usuario" || !Number.isSafeInteger(id) || id <= 0) throw new ForbiddenError();
	const cuenta = await usuarioRepository.findUnique({ where: { id }, select: { rol: true } });
	if (cuenta?.rol !== "ADMINISTRADOR") throw new ForbiddenError();
}
