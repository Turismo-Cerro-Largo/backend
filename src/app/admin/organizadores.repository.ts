import { prisma } from "../../configuracion/db.js";
import type { EstadoOrganizador } from "../../configuracion/generated/prisma/enums.js";
import { camposPerfil } from "../organizador/organizador.consts.js";

export const organizadoresAdminRepository = {
	listar: (estado: EstadoOrganizador | undefined, offset: number, limit: number) =>
		prisma.organizador.findMany({
			where: estado ? { estado } : {},
			skip: offset,
			take: limit,
			orderBy: { creado_en: "desc" },
			select: { ...camposPerfil, documentos: { select: { tipo: true, uri: true } } },
		}),
	detalle: (id: number) =>
		prisma.organizador.findUnique({
			where: { id },
			select: {
				...camposPerfil,
				motivo_rechazo: true,
				documentos: { select: { tipo: true, uri: true } },
			},
		}),
	existe: (id: number) =>
		prisma.organizador.findUnique({ where: { id }, select: { id: true } }),
	cambiarEstado: (id: number, estado: EstadoOrganizador, motivo_rechazo: string | null) =>
		prisma.organizador.update({
			where: { id },
			data: { estado, motivo_rechazo },
			select: { id: true, estado: true, motivo_rechazo: true },
		}),
};
