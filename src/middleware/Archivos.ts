import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createMiddleware } from "hono/factory";
import { BadRequestError } from "../configuracion/AppError.js";

// Archivos generales
const Archivos = (carpeta: "publico" | "privado") => {
	return createMiddleware(async (c, next) => {
		const body = await c.req.parseBody({ all: true });
		const ruta = path.join(process.cwd(), carpeta);

		const recursos = body.recursos;

		if (!Array.isArray(recursos)) {
			throw new BadRequestError();
		}

		await mkdir(ruta, { recursive: true });

		const guardados: string[] = [];

		for (const recurso of recursos) {
			if (!(recurso instanceof File)) {
				throw new BadRequestError();
			}

			const nombre = `${Date.now()}-${randomUUID()}${path.extname(recurso.name)}`;

			await writeFile(path.join(ruta, nombre), Buffer.from(await recurso.arrayBuffer()));

			guardados.push(nombre);
		}

		c.set("recursos", guardados);

		await next();
	});
};

// Exclusivo de organizador
const ArchivosOrg = createMiddleware<{
    Variables: { fotoCedulaFrente: string; fotoCedulaDorso: string };
}>(async (c, next) => {
    const body = await c.req.parseBody();
    const imagenes = [body.fotoCedulaFrente, body.fotoCedulaDorso];
    const permitidos: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
    const preparados: { contenido: Buffer; extension: string }[] = [];
    for (const imagen of imagenes) {
        if (!(imagen instanceof File) || !permitidos[imagen.type] || imagen.size < 1 || imagen.size > 8 * 1024 * 1024) {
            throw new BadRequestError("Las imágenes deben ser JPG, PNG o WebP y pesar hasta 8 MB.");
        }
        const contenido = Buffer.from(await imagen.arrayBuffer());
        const esJpg = contenido.length > 2 && contenido[0] === 255 && contenido[1] === 216 && contenido[2] === 255;
        const esPng = contenido.length >= 8 && contenido.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const esWebp = contenido.length >= 12 && contenido.toString("ascii",0,4) === "RIFF" && contenido.toString("ascii",8,12) === "WEBP";
        if (!(imagen.type === "image/jpeg" && esJpg || imagen.type === "image/png" && esPng || imagen.type === "image/webp" && esWebp)) {
            throw new BadRequestError("El archivo no es una imagen válida.");
        }
        preparados.push({ contenido, extension: permitidos[imagen.type] });
    }
    const ruta = path.join(process.cwd(), "privado");
    await mkdir(ruta, { recursive: true, mode: 0o700 });
    const nombres: string[] = [];
    try {
        for (const imagen of preparados) {
            const nombre = `${Date.now()}-${randomUUID()}${imagen.extension}`;
            await writeFile(path.join(ruta, nombre), imagen.contenido, { mode: 0o600 });
            nombres.push(nombre);
        }
    } catch (e) {
        await Promise.all(nombres.map(nombre => unlink(path.join(ruta,nombre)).catch(() => undefined)));
        throw e;
    }
    c.set("fotoCedulaFrente", nombres[0]);
    c.set("fotoCedulaDorso", nombres[1]);
    await next();
});

export { Archivos, ArchivosOrg };
