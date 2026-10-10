import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => z.string().trim().max(max).optional().default('');
const number = (min: number, max: number) => z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number<string | number>().finite().min(min).max(max));
export const identifier = z.preprocess((value) => typeof value === 'string' ? value.replace(/^[A-Z]-/, '') : value, z.coerce.number().int().positive());
const url = optional(500).refine((value) => !value || /^https?:\/\//i.test(value) && URL.canParse(value), 'La dirección web no es válida.');
export const placeSchema = z.object({ nombre: text(150), detalle: text(100), extra: text(120), descripcion: text(5000), direccion: optional(255), latitud: number(-90,90), longitud: number(-180,180), telefono: optional(30), sitioWeb: url, horario: optional(255), estado: z.enum(['Publicado','Oculto']) });
export const categorySchema = z.object({ nombre: text(100), descripcion: optional(255) });
export const companySchema = z.object({ nombre: text(150), telefono: optional(30), web: url });
export const eventSchema = z.object({ nombre: text(180), descripcion: text(5000), categoria: identifier, organizador: z.union([z.literal(''), identifier]).optional().default(''), inicio: text(30), fin: optional(30), lugar: text(255), latitud: number(-90,90), longitud: number(-180,180), entrada: z.enum(['Gratuita','Con costo']), precio: number(0,99999999.99), contacto: optional(255) })
    .refine((d) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.inicio) && Number.isFinite(Date.parse(d.inicio+'-03:00')), 'La fecha de inicio no es válida.')
    .refine((d) => !d.fin || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.fin) && Date.parse(d.fin+'-03:00') > Date.parse(d.inicio+'-03:00'), 'La finalización debe ser posterior al inicio.')
    .refine((d) => d.entrada === 'Gratuita' || d.precio > 0, 'El precio debe ser mayor que cero.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const scheduleSchema = z.object({ empresa: identifier, origen: text(120), destino: text(120), salida: time, llegada: time, diaLlegada: z.enum(['Mismo día','Día siguiente']), dias: text(100), tipo: z.enum(['Departamental','Interdepartamental']), precio: number(0,99999999.99) })
    .refine((d) => d.origen.toLocaleLowerCase('es') !== d.destino.toLocaleLowerCase('es'), 'Origen y destino deben ser distintos.')
    .refine((d) => d.diaLlegada === 'Día siguiente' || d.llegada > d.salida, 'La llegada debe ser posterior a la salida.');
export const decisionSchema = z.object({ estado: z.enum(['Publicado','Aprobado','Rechazado']), motivo: optional(500) }).strict();
export const visibilitySchema = z.object({ estado: z.enum(['Publicado','Oculto']) }).strict();
