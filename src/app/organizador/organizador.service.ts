import type { z } from "zod";
import { UnauthorizedError } from "../../configuracion/AppError.js";
import { datosPerfil } from "./organizador.scheme.js";
import { organizadorRepository as repo } from "./organizador.repository.js";

export const organizadorService = {
	async perfil(id: number) {
		const organizador = await repo.perfil(id);
		if (!organizador) throw new UnauthorizedError();
		return organizador;
	},
	async editarPerfil(id: number, datos: z.infer<typeof datosPerfil>) {
		const actual = await repo.estado(id);
		if (!actual) throw new UnauthorizedError();
		return repo.actualizarPerfil(id, {
			nombre_organizacion: datos.nombre_organizacion,
			departamento: datos.departamento,
			telefono: datos.telefono,
			sitio_web: datos.sitio_web || null,
		}, actual.estado === "RECHAZADO");
	},
};
