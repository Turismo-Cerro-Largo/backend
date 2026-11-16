import type { Prisma } from "../../configuracion/generated/prisma/client.js";
import { prisma } from "../../configuracion/db.js";
import type { EstadoEvento } from "../../configuracion/generated/prisma/enums.js";

const seleccionEvento = {
	id: true,
	titulo: true,
	descripcion: true,
	inicio: true,
	fin: true,
	categoria: true,
	lugar_evento: true,
	latitud: true,
	longitud: true,
	es_gratuito: true,
	precio: true,
	contacto: true,
	recursos: {
		orderBy: { orden: "asc" as const },
		select: { id: true, tipo: true, descripcion: true },
	},
} as const;

export function listarPublicados({
	categorias,
	desde,
	hasta,
	buscar,
	limit,
	skip,
}: {
	categorias: number[];
	desde?: Date;
	hasta?: Date;
	buscar: string;
	limit: number;
	skip: number;
}) {
	return prisma.evento.findMany({
		where: {
			estado: "PUBLICADO",
			...(categorias.length ? { id_categoria: { in: categorias } } : {}),
			AND: [
				...(hasta ? [{ inicio: { lte: hasta } }] : []),
				...(desde
					? [{ OR: [{ fin: { gte: desde } }, { fin: null, inicio: { gte: desde } }] }]
					: []),
				...(buscar
					? [{ OR: [{ titulo: { contains: buscar, mode: "insensitive" as const } }, { lugar_evento: { contains: buscar, mode: "insensitive" as const } }] }]
					: []),
			],
		},
		take: limit,
		skip,
		orderBy: [{ inicio: "asc" }, { id: "asc" }],
		select: seleccionEvento,
	});
}

export function buscarPublicado(id: number) {
	return prisma.evento.findFirst({ where: { id, estado: "PUBLICADO" }, select: seleccionEvento });
}

export function listarAdministrables(
	estado: EstadoEvento | undefined,
	buscar: string,
	offset: number,
	limit: number,
) {
	const where = {
		...(estado ? { estado } : {}),
		...(buscar
			? {
					OR: [{ titulo: { contains: buscar, mode: "insensitive" as const } }, { descripcion: { contains: buscar, mode: "insensitive" as const } }],
				}
			: {}),
	};

	return Promise.all([
		prisma.evento.count({ where }),
		prisma.evento.findMany({
			where,
			skip: offset,
			take: limit,
			orderBy: { creado_en: "desc" },
			select: {
				id: true,
				titulo: true,
				estado: true,
				inicio: true,
				creado_en: true,
				lugar_evento: true,
				categoria: { select: { nombre: true } },
				organizador: { select: { id: true, nombre_organizacion: true } },
				recursos: {
					select: { uri: true, tipo: true },
					take: 1,
					orderBy: { orden: "asc" },
				},
			},
		}),
		prisma.evento.count({ where: { estado: "PENDIENTE_REVISION" } }),
	]);
}

export function listarCalendario(
	estado: EstadoEvento | undefined,
	buscar: string,
	desde: Date,
	hasta: Date,
) {
	const where = {
		inicio: { gte: desde, lt: hasta },
		...(estado ? { estado } : {}),
		...(buscar
			? {
					OR: [{ titulo: { contains: buscar, mode: "insensitive" as const } }, { descripcion: { contains: buscar, mode: "insensitive" as const } }],
				}
			: {}),
	};

	return prisma.evento.findMany({
		where,
		orderBy: { inicio: "asc" },
		select: {
			id: true,
			titulo: true,
			estado: true,
			inicio: true,
			creado_en: true,
			lugar_evento: true,
			categoria: { select: { nombre: true } },
			organizador: { select: { id: true, nombre_organizacion: true } },
		},
	});
}

export function buscarAdministrable(id: number) {
	return prisma.evento.findUnique({
		where: { id },
		include: {
			categoria: true,
			organizador: {
				select: { id: true, nombre_organizacion: true, rut_ruc: true },
			},
			recursos: {
				select: { uri: true, tipo: true, orden: true },
				orderBy: { orden: "asc" },
			},
		},
	});
}

export function contar<T extends Prisma.EventoCountArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoCountArgs>,
) {
	return prisma.evento.count(args);
}

export function listar<T extends Prisma.EventoFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoFindManyArgs>,
) {
	return prisma.evento.findMany(args);
}

export function crear<T extends Prisma.EventoCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoCreateArgs>,
) {
	return prisma.evento.create(args);
}

export function buscar<T extends Prisma.EventoFindFirstArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoFindFirstArgs>,
) {
	return prisma.evento.findFirst(args);
}

export function editar<T extends Prisma.EventoUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoUpdateArgs>,
) {
	return prisma.evento.update(args);
}

export function eliminarPropio<T extends Prisma.EventoDeleteManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoDeleteManyArgs>,
) {
	return prisma.evento.deleteMany(args);
}

export function buscarId<T extends Prisma.EventoFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.EventoFindUniqueArgs>,
) {
	return prisma.evento.findUnique(args);
}

export function buscarCategoria<T extends Prisma.CategoriaFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.CategoriaFindUniqueArgs>,
) {
	return prisma.categoria.findUnique(args);
}

export function listarCategorias<T extends Prisma.CategoriaFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.CategoriaFindManyArgs>,
) {
	return prisma.categoria.findMany(args);
}
