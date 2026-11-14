import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function count<T extends Prisma.UbicacionCountArgs>(
	args: Prisma.SelectSubset<T, Prisma.UbicacionCountArgs>,
) {
	return prisma.ubicacion.count(args);
}

export function findMany<T extends Prisma.UbicacionFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.UbicacionFindManyArgs>,
) {
	return prisma.ubicacion.findMany(args);
}

export function findUnique<T extends Prisma.UbicacionFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.UbicacionFindUniqueArgs>,
) {
	return prisma.ubicacion.findUnique(args);
}

export function create<T extends Prisma.UbicacionCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.UbicacionCreateArgs>,
) {
	return prisma.ubicacion.create(args);
}

export function update<T extends Prisma.UbicacionUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.UbicacionUpdateArgs>,
) {
	return prisma.ubicacion.update(args);
}

export function findFirst<T extends Prisma.UbicacionFindFirstArgs>(
	args: Prisma.SelectSubset<T, Prisma.UbicacionFindFirstArgs>,
) {
	return prisma.ubicacion.findFirst(args);
}
