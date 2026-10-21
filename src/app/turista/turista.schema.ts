import { z } from "zod";

const textoOpcional = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.nullable()
		.transform((v) => v || null);

// Lista explícita: no permite actualizar cédula, correo, rol o contraseña.
export const perfilSchema = z
	.object({
		nombres: z.string().trim().min(2).max(100),
		apellidos: z.string().trim().min(2).max(100),
		telefono: textoOpcional(30).refine((v) => v === null || /^\+?[0-9 ()-]{7,30}$/.test(v)),
		departamento: textoOpcional(100),
		localidad: textoOpcional(120),
		genero: z.enum(["masculino", "femenino", "otro"]).optional(),
		fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
			const fecha = new Date(`${valor}T00:00:00Z`);
			return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
				&& valor >= "1900-01-01" && valor <= new Date().toISOString().slice(0, 10);
		}).transform((valor) => new Date(`${valor}T00:00:00Z`)).optional(),
	})
	.strict();

export const valoracionSchema = z
	.object({
		calificacion: z.number().int().min(1).max(5),
		texto: z
			.string()
			.trim()
			.max(2000)
			.optional()
			.transform((v) => v || null),
	})
	.strict();

export function idValido(value: string) {
	const id = Number(value);
	return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
