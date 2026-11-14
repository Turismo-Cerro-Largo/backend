import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findFirst<T extends Prisma.DocumentoOrganizadorFindFirstArgs>(
	args: Prisma.SelectSubset<T, Prisma.DocumentoOrganizadorFindFirstArgs>,
) {
	return prisma.documentoOrganizador.findFirst(args);
}
