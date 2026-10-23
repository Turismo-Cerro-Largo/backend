import { prisma } from "../../configuracion/db.js";
import { camposPerfil } from "./organizador.consts.js";

export const organizadorRepository = {
	perfil: (id: number) =>
		prisma.organizador.findUnique({ where: { id }, select: camposPerfil }),
	estado: (id: number) =>
		prisma.organizador.findUnique({ where: { id }, select: { estado: true } }),
	actualizarPerfil: (
		id: number,
		datos: { nombre_organizacion: string; departamento: string; telefono: string; sitio_web: string | null },
		reabrirRevision: boolean,
	) =>
		prisma.organizador.update({
			where: { id },
			data: {
				...datos,
				...(reabrirRevision ? { estado: "PENDIENTE_REVISION" as const, motivo_rechazo: null } : {}),
			},
			select: camposPerfil,
		}),
};
