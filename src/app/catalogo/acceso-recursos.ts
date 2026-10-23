import type { Context } from "hono";
import { prisma } from "../../configuracion/db.js";
import { leerSesion } from "../../middleware/Session.js";

export async function recursoVisible(
	c: Context,
	filtro: { id?: number; uri?: string | { in: string[] } },
) {
	const recurso = await prisma.recurso.findFirst({
		where: { ...filtro, id_comentario: null },
		select: {
			id: true,
			uri: true,
			tipo: true,
			evento: { select: { estado: true, id_organizador: true } },
			ubicacion: { select: { estado: true } },
		},
	});
	// No servir recursos ambiguos o sin relación a contenido.
	if (!recurso || Boolean(recurso.evento) === Boolean(recurso.ubicacion)) return null;
	if (recurso.evento?.estado === "PUBLICADO" || recurso.ubicacion?.estado === "PUBLICADO")
		return recurso;
	const sesion = await leerSesion(c).catch(() => null);
	if (sesion?.tipo === "usuario" && sesion.rol === "ADMINISTRADOR") return recurso;
	if (sesion?.tipo === "organizador" && recurso.evento?.id_organizador === Number(sesion.id))
		return recurso;
	return null;
}
