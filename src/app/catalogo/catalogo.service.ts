import * as ubicacionRepository from "../ubicaciones/ubicaciones.repository.js";
import { recursoVisible, type ObtenerSesion } from "./acceso-recursos.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import { idValido } from "../shared/parametros.js";
import { responderObjeto, storageRemoto } from "../../services/storage.service.js";

export async function lugaresMapa(query: Record<string, string | undefined>) {
	const buscar = (query.buscar || "").trim();
	if (buscar.length > 100) throw new BadRequestError();
	const lugares = await ubicacionRepository.findMany({
		where: {
			estado: "PUBLICADO",
			...(buscar
				? {
						OR: [
							{ nombre: { contains: buscar, mode: "insensitive" as const } },
							{ localidad: { contains: buscar, mode: "insensitive" as const } },
							{ categoria: { is: { nombre: { contains: buscar, mode: "insensitive" as const } } } },
						],
					}
				: {}),
		},
		select: {
			id: true,
			nombre: true,
			localidad: true,
			latitud: true,
			longitud: true,
			categoria: { select: { nombre: true } },
		},
		orderBy: [{ nombre: "asc" }, { id: "asc" }],
		take: 501,
	});
	return { lugares: lugares.slice(0, 500), limitado: lugares.length > 500 };
}

export async function servirRecurso(
	idRecibido: string,
	range: string | undefined,
	esHead: boolean,
	sesion: ObtenerSesion,
) {
	const id = idValido(idRecibido);
	if (!id) throw new NotFoundError();
	const recurso = await recursoVisible(sesion, { id });
	if (!recurso) throw new NotFoundError();
	const evento = /^\/api\/organizador\/eventos\/media\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/.exec(
		recurso.uri,
	);
	const publico =
		/^(?:\/api\/archivos)?\/publicos\/((?:seed\/)?[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|mp4|webm))$/.exec(
			recurso.uri,
		);
	const demo = /^\/publico\/demo\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|mp4|webm))$/.exec(
		recurso.uri,
	);
	const clave = evento
		? `publico/eventos/${evento[1]}`
		: publico
			? `publicos/${publico[1]}`
			: demo
				? `publico/demo/${demo[1]}`
				: null;
	if (!clave) throw new NotFoundError();
	if (storageRemoto()) {
		const video = /\.(mp4|webm)$/.test(clave);
		if (recurso.tipo !== (video ? "VIDEO" : "IMAGEN")) throw new NotFoundError();
		const respuesta = await responderObjeto(clave, video ? range : undefined, esHead);
		if (!respuesta) throw new NotFoundError();
		return respuesta;
	}
	const archivo = path.resolve(clave);
	if (/\.(mp4|webm)$/.test(archivo)) {
		if (recurso.tipo !== "VIDEO") throw new NotFoundError();
		const info = await stat(archivo).catch(() => null);
		if (!info?.isFile()) throw new NotFoundError();
		const headers = new Headers({
			"Content-Type": archivo.endsWith(".webm") ? "video/webm" : "video/mp4",
			"Accept-Ranges": "bytes",
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
		});
		let inicio = 0,
			fin = info.size - 1;

		if (range) {
			const m = /^bytes=(\d*)-(\d*)$/.exec(range);
			if (!m || (!m[1] && !m[2]))
				return new Response(null, {
					status: 416,
					headers: { "Content-Range": `bytes */${info.size}` },
				});
			inicio = m[1] ? Number(m[1]) : Math.max(0, info.size - Number(m[2]));
			fin = m[1] && m[2] ? Math.min(Number(m[2]), fin) : fin;
			if (
				!Number.isSafeInteger(inicio) ||
				!Number.isSafeInteger(fin) ||
				inicio > fin ||
				inicio >= info.size ||
				(!m[1] && Number(m[2]) === 0)
			)
				return new Response(null, {
					status: 416,
					headers: { "Content-Range": `bytes */${info.size}` },
				});
			headers.set("Content-Range", `bytes ${inicio}-${fin}/${info.size}`);
		}
		headers.set("Content-Length", String(fin - inicio + 1));
		return new Response(
			esHead
				? null
				: (Readable.toWeb(
						createReadStream(archivo, { start: inicio, end: fin }),
					) as ReadableStream),
			{ status: range ? 206 : 200, headers },
		);
	}
	if (recurso.tipo !== "IMAGEN") throw new NotFoundError();
	let bytes: Buffer;
	try {
		bytes = await readFile(archivo);
	} catch {
		throw new NotFoundError();
	}
	const tipo = archivo.endsWith(".png")
		? "image/png"
		: archivo.endsWith(".webp")
			? "image/webp"
			: archivo.endsWith(".gif")
				? "image/gif"
				: "image/jpeg";
	return new Response(new Uint8Array(bytes), {
		headers: {
			"Content-Type": tipo,
			"X-Content-Type-Options": "nosniff",
			"Cache-Control": "no-store",
		},
	});
}
