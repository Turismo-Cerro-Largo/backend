import z from "zod";

export const CrearUsuarioSchema = z.object({
    username: z.string().min(6),
    email: z.string().email(),
    apellidos: z.string().min(1),
    cedula: z.string().min(1),
    fechaNacimiento: z.coerce.date(),
    idRol: z.number().int().positive(),
    idLocalidad: z.number().int().positive(),
    telefono: z.string().optional()
})