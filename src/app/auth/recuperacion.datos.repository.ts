import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function create<T extends Prisma.SolicitudRecuperacionCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.SolicitudRecuperacionCreateArgs>,
) {
	return prisma.solicitudRecuperacion.create(args);
}

export function update<T extends Prisma.SolicitudRecuperacionUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.SolicitudRecuperacionUpdateArgs>,
) {
	return prisma.solicitudRecuperacion.update(args);
}

export function findUnique<T extends Prisma.SolicitudRecuperacionFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.SolicitudRecuperacionFindUniqueArgs>,
) {
	return prisma.solicitudRecuperacion.findUnique(args);
}
