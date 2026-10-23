import { z } from "zod";

export const organizador_estado_scheme = z
	.object({
		estado: z.enum(["PENDIENTE_REVISION", "APROBADO", "RECHAZADO"]),
		motivo_rechazo: z.string().trim().min(5).max(2000).optional(),
	})
	.refine((d) => d.estado !== "RECHAZADO" || d.motivo_rechazo !== undefined);
