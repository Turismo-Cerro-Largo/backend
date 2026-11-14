import * as recursoRepository from "../recursos/recursos.repository.js";

import type { leerSesion } from "../../middleware/Session.js";

export type ObtenerSesion = () => ReturnType<typeof leerSesion>;

export async function recursoVisible(
	obtenerSesion: ObtenerSesion,
	filtro: { id?: number; uri?: string | { in: string[] } },
) {
	const recurso = await recursoRepository.findFirst({
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
	const sesion = await obtenerSesion().catch(() => null);
	if (sesion?.tipo === "usuario" && sesion.rol === "ADMINISTRADOR") return recurso;
	if (sesion?.tipo === "organizador" && recurso.evento?.id_organizador === Number(sesion.id))
		return recurso;
	return null;
}
