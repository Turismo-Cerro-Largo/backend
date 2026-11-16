import * as ubicacionRepository from "../ubicaciones/ubicaciones.repository.js";
import * as comentarioRepository from "../comentarios/comentarios.repository.js";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import { idValido } from "../shared/parametros.js";

export const camposLugar = {
	id: true,
	nombre: true,
	descripcion: true,
	localidad: true,
	direccion: true,
	horario: true,
	telefono: true,
	sitio_web: true,
	latitud: true,
	longitud: true,
	categoria: { select: { id: true, nombre: true } },
	recursos: { orderBy: { orden: "asc" }, select: { id: true, tipo: true, descripcion: true } },
} as const;

export async function listar(query: Record<string, string | undefined>) {
	const buscar = (query.buscar || "").trim();
	const localidad = (query.localidad || "").trim();
	const pagina = Number(query.pagina || 1);
	if (
		buscar.length > 100 ||
		localidad.length > 100 ||
		!Number.isSafeInteger(pagina) ||
		pagina < 1 ||
		pagina > 10000
	)
		throw new BadRequestError();
	const where = {
		estado: "PUBLICADO" as const,
		...(localidad ? { localidad } : {}),
		...(buscar
			? { OR: [{ nombre: { contains: buscar, mode: "insensitive" as const } }, { localidad: { contains: buscar, mode: "insensitive" as const } }] }
			: {}),
	};
	const [lugares, total] = await Promise.all([
		ubicacionRepository.findMany({
			where,
			select: camposLugar,
			orderBy: [{ nombre: "asc" }, { id: "asc" }],
			skip: (pagina - 1) * 12,
			take: 12,
		}),
		ubicacionRepository.count({ where }),
	]);
	return { lugares, total, pagina, porPagina: 12 };
}

export async function detalle(valorId: string) {
	const id = idValido(valorId);
	if (!id) throw new BadRequestError();
	const lugar = await ubicacionRepository.findFirst({
		where: { id, estado: "PUBLICADO" },
		select: camposLugar,
	});
	if (!lugar) throw new NotFoundError("Este lugar no está disponible.");
	const [comentarios, valoraciones] = await Promise.all([
		comentarioRepository.findMany({
			where: { id_ubicacion: id, estado: "PUBLICADO" },
			take: 50,
			orderBy: [{ creado_en: "desc" }, { id: "desc" }],
			select: {
				id: true,
				texto: true,
				calificacion: true,
				creado_en: true,
				usuario: { select: { nombres: true } },
			},
		}),
		comentarioRepository.aggregate({
			where: { id_ubicacion: id, estado: "PUBLICADO" },
			_avg: { calificacion: true },
			_count: { id: true },
		}),
	]);
	return {
		lugar,
		comentarios,
		promedio: valoraciones._avg.calificacion,
		totalValoraciones: valoraciones._count.id,
	};
}
