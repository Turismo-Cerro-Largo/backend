// src/middleware/Archivos.ts
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createMiddleware } from "hono/factory";
import { BadRequestError } from "../configuracion/AppError.js";

// Archivos generales

const ArchivosPublicos = (
    formatos: string[],
    tamanioMB: number
) => {
    return createMiddleware<{
        Variables: { recursos: string[] }
    }>(async (c, next) => {

        const body = await c.req.parseBody({ all: true });
        const archivos = body.recursos;

        const recursos = archivos === undefined
            ? []
            : Array.isArray(archivos)
                ? archivos
                : [archivos];

        if (!Number.isFinite(tamanioMB) || tamanioMB <= 0) {
            throw new Error("Tamaño máximo inválido");
        }

        const permitidos = formatos.map(f =>
            f.replace(/^\./, "").toLowerCase()
        );

        const ruta = path.join(process.cwd(), "publicos");
        const guardados: string[] = [];

        try {
            for (const recurso of recursos) {
                if (!(recurso instanceof File)) {
                    throw new BadRequestError();
                }

                const extension = path.extname(recurso.name)
                    .slice(1)
                    .toLowerCase();

                if (!permitidos.includes(extension)) {
                    throw new BadRequestError();
                }

                if (recurso.size > tamanioMB * 1024 * 1024) {
                    throw new BadRequestError();
                }
            }

            await mkdir(ruta, { recursive: true });

            for (const recurso of recursos as File[]) {
                const extension = path.extname(recurso.name)
                    .toLowerCase();

                const nombre = `${randomUUID()}${extension}`;

                await writeFile(
                    path.join(ruta, nombre),
                    Buffer.from(await recurso.arrayBuffer()),
                    { flag: "wx" }
                );

                guardados.push(nombre);
            }

            c.set("recursos", guardados);

            await next();

            if (c.res.status >= 400) {
                await borrar_publicos(guardados);
            }
        } catch (error) {
            await borrar_publicos(guardados);
            throw error;
        }
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


export { ArchivosPrivados, ArchivosPublicos, borrar_publicos };