import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findUnique<T extends Prisma.OrganizadorFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.OrganizadorFindUniqueArgs>,
) {
	return prisma.organizador.findUnique(args);
}

export function create<T extends Prisma.OrganizadorCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.OrganizadorCreateArgs>,
) {
	return prisma.organizador.create(args);
}

export function findFirst<T extends Prisma.OrganizadorFindFirstArgs>(
	args: Prisma.SelectSubset<T, Prisma.OrganizadorFindFirstArgs>,
) {
	return prisma.organizador.findFirst(args);
}

export function cambiarAcceso(
	id: number,
	estado: import("../../configuracion/generated/prisma/enums.js").EstadoAcceso,
) {
	const where: Prisma.OrganizadorWhereInput = {
		id,
		estado_acceso: { notIn: ["ELIMINADO", estado] },
	};
	return prisma.organizador.updateMany({
		where,
		data: { estado_acceso: estado, version_sesion: { increment: 1 } },
	});
}
