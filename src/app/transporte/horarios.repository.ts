import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findMany<T extends Prisma.HorarioOmnibusFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.HorarioOmnibusFindManyArgs>,
) {
	return prisma.horarioOmnibus.findMany(args);
}

export function count<T extends Prisma.HorarioOmnibusCountArgs>(
	args: Prisma.SelectSubset<T, Prisma.HorarioOmnibusCountArgs>,
) {
	return prisma.horarioOmnibus.count(args);
}

export function findUnique<T extends Prisma.HorarioOmnibusFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.HorarioOmnibusFindUniqueArgs>,
) {
	return prisma.horarioOmnibus.findUnique(args);
}

export function create<T extends Prisma.HorarioOmnibusCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.HorarioOmnibusCreateArgs>,
) {
	return prisma.horarioOmnibus.create(args);
}

export function update<T extends Prisma.HorarioOmnibusUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.HorarioOmnibusUpdateArgs>,
) {
	return prisma.horarioOmnibus.update(args);
}

export function eliminar<T extends Prisma.HorarioOmnibusDeleteArgs>(
	args: Prisma.SelectSubset<T, Prisma.HorarioOmnibusDeleteArgs>,
) {
	return prisma.horarioOmnibus.delete(args);
}
