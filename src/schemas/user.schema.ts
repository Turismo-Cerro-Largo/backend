import z from "zod";

export const CrearUsuarioSchema = z.object({
    username: z.string().min(6),
    email: z.string().email()
})