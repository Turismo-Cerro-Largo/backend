import { z } from "zod";

export const formulario = z.object({
  titulo: z.string().trim().min(2).max(180),
  descripcion: z.string().trim().min(5).max(5000),
  inicio: z.string().refine(s => !Number.isNaN(Date.parse(s)), 'Fecha inválida'),
  fin: z.string().optional().default(''),
  id_categoria: z.coerce.number().int().positive(),
  localidad: z.string().trim().max(120).default(''),
  direccion: z.string().trim().max(150).default(''),
  latitud: z.string().default(''),
  longitud: z.string().default(''),
  es_gratuito: z.enum(['true', 'false']),
  precio: z.string().default(''),
  telefono: z.string().trim().max(30).default(''),
  correo: z.union([z.literal(''), z.email()]).default(''),
  redes: z.string().trim().max(80).default(''),
  accion: z.enum(['borrador', 'revision'])
});

export type Datos = z.infer<typeof formulario>;
