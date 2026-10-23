import type { z } from "zod";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import type { EstadoOrganizador } from "../../configuracion/generated/prisma/enums.js";
import { organizador_estado_scheme } from "./organizadores.schema.js";
import { organizadoresAdminRepository as repo } from "./organizadores.repository.js";

function idValido(valor: string) {
	const id = Number(valor);
	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();
	return id;
}
function entero(valor: string | undefined, defecto: number, minimo: number, maximo: number) {
	if (valor === undefined) return defecto;
	const numero = Number(valor);
	if (!Number.isSafeInteger(numero) || numero < minimo || numero > maximo) throw new BadRequestError();
	return numero;
}

export const organizadoresAdminService = {
	async listar(estado: string | undefined, offset: string | undefined, limit: string | undefined) {
		if (estado && !["PENDIENTE_REVISION", "APROBADO", "RECHAZADO"].includes(estado))
			throw new BadRequestError();
		return repo.listar(
			estado as EstadoOrganizador | undefined,
			entero(offset, 0, 0, 1000000),
			entero(limit, 10, 1, 50),
		);
	},
	async detalle(valor: string) {
		const organizador = await repo.detalle(idValido(valor));
		if (!organizador) throw new NotFoundError();
		return organizador;
	},
	async cambiarEstado(valor: string, datos: z.infer<typeof organizador_estado_scheme>) {
		const id = idValido(valor);
		if (!(await repo.existe(id))) throw new NotFoundError();
		return repo.cambiarEstado(id, datos.estado, datos.estado === "RECHAZADO" ? datos.motivo_rechazo ?? null : null);
	},
};
