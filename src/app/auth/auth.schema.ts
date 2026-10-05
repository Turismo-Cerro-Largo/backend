import { z } from "zod";

const emailRegex =
	/^[a-zA-Z0-9._%+-]+@(gmail\.com|tuta\.com|tutanota\.com|hotmail\.com|outlook\.com|live\.com|proton\.me|protonmail\.com|yahoo\.com|icloud\.com)$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).*$/;
const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?:[ '-][A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/;
const organizacionRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9][A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .,&'()/-]*$/;
const rutRegex = /^[0-9]+$/;
const telefonoRegex = /^\+?[0-9 -]+$/;
const departamentos = [
	"Artigas",
	"Canelones",
	"Cerro Largo",
	"Colonia",
	"Durazno",
	"Flores",
	"Florida",
	"Lavalleja",
	"Maldonado",
	"Montevideo",
	"Paysandú",
	"Río Negro",
	"Rivera",
	"Rocha",
	"Salto",
	"San José",
	"Soriano",
	"Tacuarembó",
	"Treinta y Tres",
] as const;

const fechaNacimientoSchema = z
	.string()
	.min(1)
	.refine((fecha) => {
		const fechaNacimiento = new Date(`${fecha}T00:00:00`);
		const fechaMinima = new Date("1900-01-01T00:00:00");
		const hoy = new Date();
		return (
			!Number.isNaN(fechaNacimiento.getTime()) &&
			fechaNacimiento >= fechaMinima &&
			fechaNacimiento <= hoy
		);
	});

export const auth_usuario_login_scheem = z.object({
	email: z.string().min(7).max(45).email().regex(emailRegex),
	password: z.string().min(8).max(32).regex(passwordRegex),
});

export const auth_usuario_register_scheem = z.object({
	nombres: z.string().min(2).max(60).regex(nombreRegex),
	apellidos: z.string().min(2).max(60).regex(nombreRegex),
	email: z.string().min(7).max(45).email().regex(emailRegex),
	departamento: z.enum(departamentos),
	fecha_nacimiento: fechaNacimientoSchema,
	genero: z.enum(["masculino", "femenino", "otro"]),
	password: z.string().min(8).max(32).regex(passwordRegex),
});

export const auth_organizador_register_scheem = z.object({
	nombreOrganizacion: z.string().min(2).max(100).regex(organizacionRegex),
	rut: z.string().length(12).regex(rutRegex),
	departamento: z.enum(departamentos),
	email: z.string().min(7).max(45).email().regex(emailRegex),
	telefono: z.string().min(8).max(20).regex(telefonoRegex),
	password: z.string().min(8).max(32).regex(passwordRegex),

	fotoCedulaFrente: z.any(),
	fotoCedulaDorso: z.any(),
});

export type auth_usuario_login_infer = z.infer<typeof auth_usuario_login_scheem>;

export type auth_usuario_register_infer = z.infer<typeof auth_usuario_register_scheem>;

export type auth_organizador_register_infer = z.infer<typeof auth_organizador_register_scheem>;
