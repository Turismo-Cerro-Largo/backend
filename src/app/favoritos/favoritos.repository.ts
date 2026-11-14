import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findMany<T extends Prisma.FavoritoFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.FavoritoFindManyArgs>,
) {
	return prisma.favorito.findMany(args);
}

export function count<T extends Prisma.FavoritoCountArgs>(
	args: Prisma.SelectSubset<T, Prisma.FavoritoCountArgs>,
) {
	return prisma.favorito.count(args);
}
