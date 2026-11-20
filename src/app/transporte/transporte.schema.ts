import { z } from "zod";

const texto = z.string().trim().min(1).max(150);
const opcional = z.union([z.string().trim().max(255), z.null()]).optional();
export const empresaSchema = z
	.object({
		nombre: texto,
		telefono: z.union([z.string().trim().max(50), z.null()]).optional(),
		sitio_web: opcional.refine(
			(x) => !x || /^https?:\/\//i.test(x),
			"El sitio debe comenzar con http:// o https://",
		),
	})
	.strict();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const horarioSchema = z
	.object({
		id_empresa: z.number().int().positive(),
		origen: texto,
		destino: texto,
		hora_salida: hora,
		hora_llegada: hora.nullable(),
		dias: z.string().trim().min(1).max(100),
		tipo_servicio: z.enum(["DEPARTAMENTAL", "INTERDEPARTAMENTAL"]),
		precio: z.number().nonnegative().max(1000000).nullable(),
		estado: z.enum(["PUBLICADO", "OCULTADO"]),
	})
	.strict();
export const estadoHorarioSchema = z.object({ estado: z.enum(["PUBLICADO", "OCULTADO"]) }).strict();
