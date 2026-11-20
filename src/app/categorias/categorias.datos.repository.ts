import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findUnique<T extends Prisma.CategoriaFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.CategoriaFindUniqueArgs>,
) {
	return prisma.categoria.findUnique(args);
}
