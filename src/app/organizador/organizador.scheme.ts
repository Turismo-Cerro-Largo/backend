// src/app/organizador/organizador.scheme.ts
import z from "zod";
import { departamentos } from "./organizador.consts.js";

export const datosPerfil = z.object({
    nombre_organizacion: z.string().trim().min(2).max(100)
        .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9][A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .,&'()/-]*$/),
    departamento: z.enum(departamentos),
    telefono: z.string().trim().min(8).max(20).regex(/^\+?[0-9 -]+$/),
    sitio_web: z.union([z.literal(""), z.string().url().max(500)])
}).strict();

