// src/app/categorias/categorias.scheme.ts

import z from "zod";

export const categoria_scheme = z.object({
	nombre: z.string().min(1).max(28),
	descripcion: z.string(),
});
