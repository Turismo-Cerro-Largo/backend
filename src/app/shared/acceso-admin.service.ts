import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../configuracion/AppError.js";
import type { EstadoAcceso } from "../../configuracion/generated/prisma/enums.js";
import { idValido } from "./parametros.js";

type Cuenta = { estado_acceso: EstadoAcceso; rol?: string };
type Repository = {
	cambiarAcceso(id: number, estado: EstadoAcceso): Promise<{ count: number }>;
	findUnique(args: { where: { id: number } }): Promise<Cuenta | null>;
};

export async function gestionarAcceso(
	valorId: string,
	estado: EstadoAcceso,
	repository: Repository,
) {
	const id = idValido(valorId);
	if (!id) throw new BadRequestError();
	if ((await repository.cambiarAcceso(id, estado)).count === 1) return { estado_acceso: estado };
	const cuenta = await repository.findUnique({ where: { id } });
	if (!cuenta) throw new NotFoundError();
	if (cuenta.rol === "ADMINISTRADOR")
		throw new ForbiddenError("No se puede modificar el acceso de una cuenta administradora.");
	if (cuenta.estado_acceso === estado) return { estado_acceso: estado };
	throw new ConflictError("La cuenta fue eliminada o su estado cambió. Recargá la ficha.");
}
