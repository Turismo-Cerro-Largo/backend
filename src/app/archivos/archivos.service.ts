import * as documentoOrganizadorRepository from "./documentos.repository.js";
import { recursoVisible, type ObtenerSesion } from "../catalogo/acceso-recursos.js";
import { getMimeType } from "hono/utils/mime";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";

export async function publico(archivo: string, sesion: ObtenerSesion) {
	if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|mp4|webm)$/.test(archivo))
		throw new NotFoundError();
	const recurso = await recursoVisible(sesion, {
		uri: { in: [`/api/archivos/publicos/${archivo}`, `/publicos/${archivo}`] },
	});
	if (!recurso) throw new NotFoundError();
	return `/api/recursos/${recurso.id}`;
}

export async function seed(archivo: string, sesion: ObtenerSesion) {
	if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|mp4|webm)$/.test(archivo))
		throw new NotFoundError();
	const uri = `/api/archivos/publicos/seed/${archivo}`;
	const recurso = await recursoVisible(sesion, { uri: { in: [uri, `/publicos/seed/${archivo}`] } });
	if (!recurso) throw new NotFoundError();
	return `/api/recursos/${recurso.id}`;
}

export async function privado(archivo: string, sesion: { id: string; rol: string }) {
	if (archivo !== path.basename(archivo)) throw new BadRequestError();

	if (
		!(await documentoOrganizadorRepository.findFirst({
			where: {
				uri: archivo,
				...(sesion.rol === "ADMINISTRADOR" ? {} : { id_organizador: Number(sesion.id) }),
			},
			select: { id: true },
		}))
	)
		throw new NotFoundError();

	const contenido = await readFile(path.join(process.cwd(), "privados", archivo)).catch(() => null);

	if (!contenido) throw new NotFoundError();

	return { contenido, tipo: getMimeType(archivo) ?? "application/octet-stream" };
}
