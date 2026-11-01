import { randomUUID } from "node:crypto";
import { putObject, deleteObject } from "./storage.js";
import path from "node:path";
import { BadRequestError, PayloadTooLargeError } from "../configuracion/AppError.js";

type Formato = "jpg" | "jpeg" | "png" | "webp" | "gif" | "mp4" | "webm";
const firmas: Record<Formato, { mime: string; coincide: (bytes: Buffer) => boolean }> = {
	jpg: { mime: "image/jpeg", coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	jpeg: { mime: "image/jpeg", coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	png: {
		mime: "image/png",
		coincide: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
	},
	webp: {
		mime: "image/webp",
		coincide: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
	},
	gif: {
		mime: "image/gif",
		coincide: (b) => ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6)),
	},
	mp4: { mime: "video/mp4", coincide: (b) => b.toString("ascii", 4, 8) === "ftyp" },
	webm: {
		mime: "video/webm",
		coincide: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
	},
};

export async function validarArchivo(file: File, permitidos: readonly string[], maxMB: number) {
	const extension = path.extname(file.name).slice(1).toLowerCase() as Formato;
	const firma = firmas[extension];
	if (!firma || !permitidos.includes(extension) || file.type !== firma.mime)
		throw new BadRequestError("Formato de archivo no permitido.");
	if (file.size > maxMB * 1024 * 1024)
		throw new PayloadTooLargeError("El archivo es demasiado grande.");
	if (file.size < 12 || !firma.coincide(Buffer.from(await file.slice(0, 16).arrayBuffer())))
		throw new BadRequestError("El contenido del archivo no coincide con su formato.");
	return extension;
}

export async function borrarArchivos(carpeta: "publicos" | "privados", nombres: readonly string[]) {
	await Promise.all(nombres.map((nombre) => deleteObject(carpeta + "/" + nombre)));
}

export async function guardarArchivos(
	carpeta: "publicos" | "privados",
	archivos: readonly File[],
	formatos: readonly string[],
	maxMB: number,
) {
	const extensiones = await Promise.all(
		archivos.map((archivo) => validarArchivo(archivo, formatos, maxMB)),
	);

	const guardados: string[] = [];

	try {
		for (const [indice, archivo] of archivos.entries()) {
			const nombre = randomUUID() + "." + extensiones[indice];
			await putObject(carpeta + "/" + nombre, archivo);
			guardados.push(nombre);
		}
		return guardados;
	} catch (error) {
		await borrarArchivos(carpeta, guardados);
		throw error;
	}
}

export const directorioFotoPerfil = () => "privado/perfiles";
const nombreFotoValido = (nombre: string) => /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre);

export async function guardarFotoPerfil(file: File) {
	const extension = await validarArchivo(file, ["jpg", "jpeg", "png", "webp"], 3);
	const nombre = randomUUID() + "." + (extension === "jpeg" ? "jpg" : extension);

	await putObject("privado/perfiles/" + nombre, file);
	return nombre;
}

export async function borrarFotoPerfil(nombre: string | null) {
	if (!nombre || !nombreFotoValido(nombre)) return;
	await deleteObject("privado/perfiles/" + nombre);
}
