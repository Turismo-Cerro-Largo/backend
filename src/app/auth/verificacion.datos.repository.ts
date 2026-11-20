import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function upsert<T extends Prisma.VerificacionCorreoUpsertArgs>(
	args: Prisma.SelectSubset<T, Prisma.VerificacionCorreoUpsertArgs>,
) {
	return prisma.verificacionCorreo.upsert(args);
}

export function findUnique<T extends Prisma.VerificacionCorreoFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.VerificacionCorreoFindUniqueArgs>,
) {
	return prisma.verificacionCorreo.findUnique(args);
}

export function updateMany<T extends Prisma.VerificacionCorreoUpdateManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.VerificacionCorreoUpdateManyArgs>,
) {
	return prisma.verificacionCorreo.updateMany(args);
}

export function deleteMany(args: Prisma.VerificacionCorreoDeleteManyArgs) {
	return prisma.verificacionCorreo.deleteMany(args);
}
