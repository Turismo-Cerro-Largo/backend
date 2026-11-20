import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function limitesPublicados(nombres: string[]) {
	return prisma.ubicacion.groupBy({
		by: ["localidad"],
		where: { estado: "PUBLICADO", localidad: { in: nombres } },
		_min: { latitud: true, longitud: true },
		_max: { latitud: true, longitud: true },
	});
}

export function findMany<T extends Prisma.LocalidadFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.LocalidadFindManyArgs>,
) {
	return prisma.localidad.findMany(args);
}

export function findUnique<T extends Prisma.LocalidadFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.LocalidadFindUniqueArgs>,
) {
	return prisma.localidad.findUnique(args);
}

export function create<T extends Prisma.LocalidadCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.LocalidadCreateArgs>,
) {
	return prisma.localidad.create(args);
}

export function eliminar<T extends Prisma.LocalidadDeleteArgs>(
	args: Prisma.SelectSubset<T, Prisma.LocalidadDeleteArgs>,
) {
	return prisma.localidad.delete(args);
}

export function listarPublicadas() {
	return prisma.localidad.findMany({
		where: { estado: "PUBLICADO" },
		orderBy: [{ nombre: "asc" }, { id: "asc" }],
		select: {
			id: true,
			slug: true,
			nombre: true,
			descripcion: true,
			latitud: true,
			longitud: true,
			icono: true,
		},
	});
}

export function buscarIcono(slug: string) {
	return prisma.localidad.findUnique({
		where: { slug: slug },
		select: { estado: true, icono: true },
	});
}
