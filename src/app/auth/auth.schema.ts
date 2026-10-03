import { z } from "zod";

export const auth_usuario_login_scheem = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

export const auth_usuario_register_scheem = z.object({
	nombres: z.string().min(1),
	apellidos: z.string().min(1),
	email: z.string().email(),
	departamento: z.string().min(1),
	localidad: z.string().min(1),
	fecha_nacimiento: z.string().min(1),
	telefono: z.string().min(1),
	genero: z.enum(["masculino", "femenino", "otro"]),
	cedula: z.string().length(8),
	password: z.string().min(8),
});

export const auth_organizador_register_scheem = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	nombreOrganizacion: z.string().min(1),
	rut: z.string().min(1),
	telefono: z.string().min(1),
	fotoCedulaFrente: z.any(),
	fotoCedulaDorso: z.any(),
});

export type auth_usuario_login_infer = z.infer<typeof auth_usuario_login_scheem>;

export type auth_usuario_register_infer = z.infer<typeof auth_usuario_register_scheem>;

export type auth_organizador_register_infer = z.infer<typeof auth_organizador_register_scheem>;
