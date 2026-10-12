// src/middleware/Archivos.ts
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createMiddleware } from "hono/factory";
import { BadRequestError } from "../configuracion/AppError.js";

// Archivos generales
const ArchivosPublicos = () => {
    return createMiddleware<{ Variables: { recursos: string[] } }>(async (c, next) => {
        const body = await c.req.parseBody({ all: true });
        const ruta = path.join(process.cwd(), "publicos");

        const archivos = body.recursos;

        const recursos = archivos === undefined
            ? []
            : Array.isArray(archivos)
                ? archivos
                : [archivos];

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

// Archivos privados
const ArchivosPrivados = () => {
    return createMiddleware<{ Variables: { fotoCedulaFrente: string; fotoCedulaDorso: string }; }>(async (c, next) => {
        const body = await c.req.parseBody({ all: true });
        const ruta = path.join(process.cwd(), "privados");

        // Imagenes enviadas
        const imagenes = [body.fotoCedulaFrente, body.fotoCedulaDorso];

        await mkdir(ruta, { recursive: true });

        const guardados: string[] = [];

        for (const recurso of imagenes) {
            if (!(recurso instanceof File)) {
                throw new BadRequestError();
            }

            const nombre = `${Date.now()}-${randomUUID()}${path.extname(recurso.name)}`;

            await writeFile(path.join(ruta, nombre), Buffer.from(await recurso.arrayBuffer()));

            guardados.push(nombre);
        }

        c.set("fotoCedulaFrente", guardados[0]);
        c.set("fotoCedulaDorso", guardados[1]);

        await next();
    });
};

const borrar_publicos = (nombres: string[]) =>
    Promise.all(nombres.map((n) => unlink(path.join(process.cwd(), "publicos", n)).catch(() => undefined)));


export { ArchivosPrivados, ArchivosPublicos, borrar_publicos};