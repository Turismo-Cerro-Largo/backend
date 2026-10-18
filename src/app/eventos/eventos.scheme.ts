// src/app/eventos/eventos.scheme.ts
import z from "zod";

// src/app/eventos/eventos.scheme.ts
export const eventos_formulario_scheme = z
	.object({
		titulo: z.string().trim().min(2).max(180),
		descripcion: z.string().trim().min(5).max(5000),
		inicio: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
		fin: z
			.string()
			.default("")
			.refine((s) => s === "" || !Number.isNaN(Date.parse(s))),
		id_categoria: z.coerce.number().int().positive(),
		localidad: z.string().trim().max(120).default(""),
		direccion: z.string().trim().max(130).default(""),
		latitud: z
			.string()
			.default("")
			.refine((s) => s === "" || (Number(s) >= -90 && Number(s) <= 90)),
		longitud: z
			.string()
			.default("")
			.refine((s) => s === "" || (Number(s) >= -180 && Number(s) <= 180)),
		es_gratuito: z.enum(["true", "false"]),
		precio: z
			.string()
			.default("")
			.refine((s) => s === "" || Number(s) >= 0),
		telefono: z.string().trim().max(30).default(""),
		correo: z.union([z.literal(""), z.email().max(100)]).default(""),
		redes: z.string().trim().max(80).default(""),
		accion: z.enum(["borrador", "revision"]),
	})
	.superRefine((d, ctx) => {
		if (d.fin !== "" && Date.parse(d.fin) < Date.parse(d.inicio))
			ctx.addIssue({ code: "custom", path: ["fin"] });
		if (d.es_gratuito === "false" && d.precio === "")
			ctx.addIssue({ code: "custom", path: ["precio"] });
		if ((d.latitud === "") !== (d.longitud === ""))
			ctx.addIssue({ code: "custom", path: ["latitud"] });
	});

// src/app/eventos/eventos.scheme.ts
export const eventos_estado_scheme = z
	.object({
		estado: z.enum([
			"BORRADOR",
			"PENDIENTE_REVISION",
			"PUBLICADO",
			"RECHAZADO",
			"CANCELADO",
			"FINALIZADO",
		]),
		motivo_rechazo: z.string().trim().min(5).max(2000).optional(),
	})
	.refine((d) => d.estado !== "RECHAZADO" || d.motivo_rechazo !== undefined);
