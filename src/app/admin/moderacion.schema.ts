import { z } from "zod";

export const moderacionEstadoSchema = z.object({ estado: z.enum(["PUBLICADO", "OCULTADO"]) }).strict();
