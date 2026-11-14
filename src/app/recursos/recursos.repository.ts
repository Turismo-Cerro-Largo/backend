import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findFirst<T extends Prisma.RecursoFindFirstArgs>(
	args: Prisma.SelectSubset<T, Prisma.RecursoFindFirstArgs>,
) {
	return prisma.recurso.findFirst(args);
}
