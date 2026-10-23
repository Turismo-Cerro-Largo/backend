// src/app/admin/ubicaciones.scheme.ts
import z from "zod";

// src/app/admin/ubicaciones.scheme.ts
export const datosSchema_ubicaciones = z.object({
    nombre: z.string().trim().min(2).max(120),
    descripcion: z.string().trim().min(5).max(5000),
    direccion: z.string().trim().max(250).nullable().optional(),
    localidad: z.string().trim().min(2).max(120),
    telefono: z.string().trim().max(50).nullable().optional(),

    sitio_web: z
        .union([z.literal(""), z.string().url().max(300)])
        .nullable()
        .optional(),

    horario: z.string().trim().max(500).nullable().optional(),

    latitud: z.number().finite().min(-90).max(90),
    longitud: z.number().finite().min(-180).max(180),

    estado: z.enum(["PUBLICADO", "OCULTADO"]),

    id_categoria: z.number().int().positive(),


    recursos: z
        .array(
            z.object({
                tipo: z.enum(["IMAGEN", "VIDEO"]),

                uri: z
                    .string()
                    .trim()
                    .max(500)
                    .regex(
                        /^\/api\/archivos\/publicos\/(?:ubicaciones\/)?[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|mp4|webm)$/i,
                        ""
                    ),
            }).refine(
                (recurso) => {
                    const esVideo = /\.(mp4|webm)$/i.test(
                        recurso.uri
                    );

                    return esVideo
                        ? recurso.tipo === "VIDEO"
                        : recurso.tipo === "IMAGEN";
                },
                {
                    message: "",
                }
            )
        )
        .max(20, "")
        .default([]),

});

export const estadoUbicacionSchema = z.object({ estado: z.enum(["PUBLICADO", "OCULTADO"]) });
