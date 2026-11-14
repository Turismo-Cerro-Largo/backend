import { prisma } from "../../configuracion/db.js";
import type { EstadoComentario } from "../../configuracion/generated/prisma/enums.js";

export const moderacionRepository = {
	listar: (estado: EstadoComentario, pagina: number) =>
		prisma.comentario.findMany({
			where: { estado },
			orderBy: [{ creado_en: "asc" }, { id: "asc" }],
			take: 30,
			skip: (pagina - 1) * 30,
			select: {
				id: true,
				texto: true,
				calificacion: true,
				estado: true,
				creado_en: true,
				usuario: { select: { nombres: true } },
				ubicacion: { select: { id: true, nombre: true } },
			},
		}),
	contar: (estado: EstadoComentario) => prisma.comentario.count({ where: { estado } }),
	cambiarEstado: (id: number, estado: EstadoComentario) =>
		prisma.comentario.updateMany({ where: { id }, data: { estado } }),
};
