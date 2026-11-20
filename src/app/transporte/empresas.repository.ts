import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findMany<T extends Prisma.EmpresaTransporteFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.EmpresaTransporteFindManyArgs>,
) {
	return prisma.empresaTransporte.findMany(args);
}

export function findUnique<T extends Prisma.EmpresaTransporteFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.EmpresaTransporteFindUniqueArgs>,
) {
	return prisma.empresaTransporte.findUnique(args);
}

export function findFirst<T extends Prisma.EmpresaTransporteFindFirstArgs>(
	args: Prisma.SelectSubset<T, Prisma.EmpresaTransporteFindFirstArgs>,
) {
	return prisma.empresaTransporte.findFirst(args);
}

export function create<T extends Prisma.EmpresaTransporteCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.EmpresaTransporteCreateArgs>,
) {
	return prisma.empresaTransporte.create(args);
}

export function update<T extends Prisma.EmpresaTransporteUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.EmpresaTransporteUpdateArgs>,
) {
	return prisma.empresaTransporte.update(args);
}

export function eliminar<T extends Prisma.EmpresaTransporteDeleteArgs>(
	args: Prisma.SelectSubset<T, Prisma.EmpresaTransporteDeleteArgs>,
) {
	return prisma.empresaTransporte.delete(args);
}
