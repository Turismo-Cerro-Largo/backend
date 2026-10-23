import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import type { EstadoComentario } from "../../configuracion/generated/prisma/enums.js";
import { idValido } from "../shared/parametros.js";
import { moderacionRepository as repo } from "./moderacion.repository.js";

const estadosConsulta = ["PENDIENTE_REVISION", "PUBLICADO", "OCULTADO"] as const;

export const moderacionService = {
	async listar(estadoParam: string | undefined, paginaParam: string | undefined) {
		const estado = estadoParam || "PENDIENTE_REVISION";
		const pagina = Number(paginaParam || 1);
		if (!estadosConsulta.some((opcion) => opcion === estado) ||
			!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000)
			throw new BadRequestError();
		const [valoraciones, total] = await Promise.all([
			repo.listar(estado as EstadoComentario, pagina),
			repo.contar(estado as EstadoComentario),
		]);
		return { valoraciones, total, pagina, porPagina: 30 };
	},
	async cambiarEstado(idParam: string, estado: "PUBLICADO" | "OCULTADO") {
		const id = idValido(idParam);
		if (!id) throw new BadRequestError();
		const resultado = await repo.cambiarEstado(id, estado);
		if (!resultado.count) throw new NotFoundError();
		return { id, estado };
	},
};
