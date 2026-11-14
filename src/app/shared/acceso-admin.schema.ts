import { z } from "zod";
import { BadRequestError } from "../../configuracion/AppError.js";

const schema = z.object({ estado_acceso: z.enum(["ACTIVO", "BLOQUEADO"]) }).strict();

export function estadoAcceso(body: unknown) {
	const datos = schema.safeParse(body);
	if (!datos.success) throw new BadRequestError("Estado de acceso inválido.");
	return datos.data.estado_acceso;
}
