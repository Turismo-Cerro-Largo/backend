import { prisma } from "../../configuracion/db.js";
import type { z } from "zod";
import { camposLugar } from "../publico/lugares.js";
import { perfilSchema, valoracionSchema } from "./turista.schema.js";

const perfilSelect = {
	id: true, nombres: true, apellidos: true, email: true,
	fecha_nacimiento: true, genero: true, telefono: true,
	departamento: true, localidad: true, foto_perfil: true, creado_en: true,
} as const;

export const turistaRepository = {
	perfil: (id: number) => prisma.usuario.findUniqueOrThrow({ where: { id }, select: perfilSelect }),
	actualizarPerfil: (id: number, datos: z.infer<typeof perfilSchema>) =>
		prisma.usuario.updateMany({
			where: {
				id,
				...(datos.genero !== undefined ? { genero: null } : {}),
				...(datos.fecha_nacimiento !== undefined ? { fecha_nacimiento: null } : {}),
			},
			data: datos,
		}),
	cambiarFoto: (id: number, anterior: string | null, nueva: string | null) =>
		prisma.usuario.updateMany({ where: { id, foto_perfil: anterior }, data: { foto_perfil: nueva } }),
	favoritos: (id: number) =>
		prisma.favorito.findMany({
			where: { id_usuario: id },
			orderBy: [{ creado_en: "desc" }, { id: "desc" }],
			select: {
				id_ubicacion: true,
				creado_en: true,
				ubicacion: { select: { ...camposLugar, estado: true } },
			},
		}),
	lugarPublicado: (id: number) =>
		prisma.ubicacion.findFirst({ where: { id, estado: "PUBLICADO" }, select: { id: true } }),
	guardarFavorito: (idUsuario: number, idUbicacion: number) => {
		const data = { id_usuario: idUsuario, id_ubicacion: idUbicacion };
		return prisma.favorito.upsert({ where: { id_usuario_id_ubicacion: data }, create: data, update: {} });
	},
	borrarFavorito: (idUsuario: number, idUbicacion: number) =>
		prisma.favorito.deleteMany({ where: { id_usuario: idUsuario, id_ubicacion: idUbicacion } }),
	valoraciones: (id: number) =>
		prisma.comentario.findMany({
			where: { id_usuario: id },
			orderBy: [{ creado_en: "desc" }, { id: "desc" }],
			select: {
				id: true, id_ubicacion: true, texto: true, calificacion: true,
				estado: true, creado_en: true,
				ubicacion: { select: { id: true, nombre: true, estado: true } },
			},
		}),
	borrarValoracionPendiente: (idUsuario: number, id: number) =>
		prisma.comentario.deleteMany({
			where: { id, id_usuario: idUsuario, estado: "PENDIENTE_REVISION" },
		}),
	estadoLugar: async (idUsuario: number, idUbicacion: number) => {
		const where = { id_usuario_id_ubicacion: { id_usuario: idUsuario, id_ubicacion: idUbicacion } };
		const [favorito, valoracion] = await Promise.all([
			prisma.favorito.findUnique({ where, select: { id: true } }),
			prisma.comentario.findUnique({
				where,
				select: { id: true, texto: true, calificacion: true, estado: true },
			}),
		]);
		return { favorito: Boolean(favorito), valoracion };
	},
	crearValoracion: (idUsuario: number, idUbicacion: number, datos: z.infer<typeof valoracionSchema>) =>
		prisma.comentario.create({
			data: {
				...datos, id_usuario: idUsuario, id_ubicacion: idUbicacion,
				estado: "PENDIENTE_REVISION",
			},
			select: { id: true, texto: true, calificacion: true, estado: true },
		}),
};
