import { readFile } from "node:fs/promises";
import path from "node:path";
import { NotFoundError } from "../../configuracion/AppError.js";

export async function responderIconoLocalidad(nombre: string | null) {
    if (!nombre || !/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(nombre)) throw new NotFoundError();
    const contenido = await readFile(path.join(process.cwd(), "publicos", nombre)).catch(() => null);
    if (!contenido) throw new NotFoundError();
    const tipo = nombre.endsWith(".png") ? "image/png" : nombre.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(contenido), {
        headers: { "Content-Type": tipo, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
}