import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findMany<T extends Prisma.ComentarioFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.ComentarioFindManyArgs>,
) {
	return prisma.comentario.findMany(args);
}

export function count<T extends Prisma.ComentarioCountArgs>(
	args: Prisma.SelectSubset<T, Prisma.ComentarioCountArgs>,
) {
	return prisma.comentario.count(args);
}

export function findUnique<T extends Prisma.ComentarioFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.ComentarioFindUniqueArgs>,
) {
	return prisma.comentario.findUnique(args);
}

export function update<T extends Prisma.ComentarioUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.ComentarioUpdateArgs>,
) {
	return prisma.comentario.update(args);
}

export function aggregate<T extends Prisma.ComentarioAggregateArgs>(
	args: Prisma.SelectSubset<T, Prisma.ComentarioAggregateArgs>,
) {
	return prisma.comentario.aggregate(args);
}
