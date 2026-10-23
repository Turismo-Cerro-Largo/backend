import { createMiddleware } from "hono/factory";
import { BadRequestError } from "../configuracion/AppError.js";
import { borrarArchivos, borrarFotoPerfil, guardarArchivos, guardarFotoPerfil } from "../services/archivos.service.js";

export const ArchivosPublicos = (formatos: string[], tamanioMB: number, maxArchivos = 20) =>
	createMiddleware<{ Variables: { recursos: string[] } }>(async (c, next) => {
		const body = await c.req.parseBody({ all: true });
		const valor = body.recursos;
		const recursos = (valor === undefined ? [] : Array.isArray(valor) ? valor : [valor])
			.filter((recurso) => recurso !== "" && !(recurso instanceof File && recurso.name === "" && recurso.size === 0));
		if (recursos.length > maxArchivos || recursos.some((recurso) => !(recurso instanceof File)))
			throw new BadRequestError("Cantidad o tipo de archivos inválidos.");
		const guardados = await guardarArchivos("publicos", recursos as File[], formatos, tamanioMB);
		c.set("recursos", guardados);
		try {
			await next();
			if (c.res.status >= 400) await borrarArchivos("publicos", guardados);
		} catch (error) {
			await borrarArchivos("publicos", guardados);
			throw error;
		}
	});

export const ArchivosPrivados = () =>
	createMiddleware<{ Variables: { fotoCedulaFrente: string; fotoCedulaDorso: string } }>(async (c, next) => {
		const body = await c.req.parseBody({ all: true });
		const archivos = [body.fotoCedulaFrente, body.fotoCedulaDorso];
		if (archivos.some((archivo) => !(archivo instanceof File))) throw new BadRequestError();
		const guardados = await guardarArchivos("privados", archivos as File[], ["jpg", "jpeg", "png", "webp"], 8);
		c.set("fotoCedulaFrente", guardados[0]!);
		c.set("fotoCedulaDorso", guardados[1]!);
		try {
			await next();
			if (c.res.status >= 400) await borrarArchivos("privados", guardados);
		} catch (error) {
			await borrarArchivos("privados", guardados);
			throw error;
		}
	});

export const borrar_publicos = (nombres: readonly string[]) => borrarArchivos("publicos", nombres);

export const ArchivosFotoPerfil = () =>
	createMiddleware<{ Variables: { fotoPerfil: string } }>(async (c, next) => {
		const body = await c.req.parseBody();
		if (!(body.foto instanceof File))
			throw new BadRequestError("Elegí una imagen JPG, PNG o WebP de hasta 3 MB.");
		const nombre = await guardarFotoPerfil(body.foto);
		c.set("fotoPerfil", nombre);
		try {
			await next();
			if (c.res.status >= 400) await borrarFotoPerfil(nombre);
		} catch (error) {
			await borrarFotoPerfil(nombre);
			throw error;
		}
	});
