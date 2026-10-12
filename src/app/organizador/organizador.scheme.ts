// src/app/organizador/organizador.scheme.ts
import z from "zod";
import { departamentos } from "./organizador.consts.js";

export const datosPerfil = z
	.object({
		nombre_organizacion: z
			.string()
			.trim()
			.min(2)
			.max(100)
			.regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9][A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .,&'()/-]*$/),
		departamento: z.enum(departamentos),
		telefono: z
			.string()
			.trim()
			.min(8)
			.max(20)
			.regex(/^\+?[0-9 -]+$/),
		sitio_web: z.union([z.literal(""), z.string().url().max(500)]),
	})
	.strict();

export const organizador_estado_scheme = z
	.object({
		estado: z.enum(["PENDIENTE_REVISION", "APROBADO", "RECHAZADO"]),
		motivo_rechazo: z.string().trim().min(5).max(2000).optional(),
	})
	.refine((d) => d.estado !== "RECHAZADO" || d.motivo_rechazo !== undefined);
