import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function eliminarDefinitivamente(id: number) {
	return prisma.$transaction(async (tx) => {
		const cuenta = await tx.organizador.findUnique({ where: { id }, include: { documentos: { select: { uri: true } }, eventos: { include: { recursos: { select: { uri: true } } } } } });
		if (!cuenta) return null;
		await tx.verificacionCorreo.deleteMany({ where: { email: cuenta.email, tipo: "ORGANIZADOR" } });
		await tx.evento.deleteMany({ where: { id_organizador: id } });
		await tx.organizador.delete({ where: { id } });
		return { documentos: cuenta.documentos.map(documento => documento.uri), recursos: cuenta.eventos.flatMap(evento => evento.recursos.map(recurso => recurso.uri)) };
	});
}

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
