import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
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
	const ruta = path.join(process.cwd(), "privado");

	const frente = body.fotoCedulaFrente;
	const dorso = body.fotoCedulaDorso;

	if (!(frente instanceof File) || !(dorso instanceof File)) {
		throw new BadRequestError();
	}

	await mkdir(ruta, { recursive: true });

	const nombreFrente = `${Date.now()}-${randomUUID()}${path.extname(frente.name)}`;
	const nombreDorso = `${Date.now()}-${randomUUID()}${path.extname(dorso.name)}`;

	await writeFile(path.join(ruta, nombreFrente), Buffer.from(await frente.arrayBuffer()));

	await writeFile(path.join(ruta, nombreDorso), Buffer.from(await dorso.arrayBuffer()));

	c.set("fotoCedulaFrente", nombreFrente);
	c.set("fotoCedulaDorso", nombreDorso);

	await next();
});

export { Archivos, ArchivosOrg };
