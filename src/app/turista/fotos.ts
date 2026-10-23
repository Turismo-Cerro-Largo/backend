import { readFile } from "node:fs/promises";
import path from "node:path";
import { NotFoundError } from "../../configuracion/AppError.js";
import { directorioFotoPerfil } from "../../services/archivos.service.js";

const nombreValido = (nombre: string) => /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre);

export async function leerFoto(nombre: string | null) {
	if (!nombre || !nombreValido(nombre)) throw new NotFoundError();
	try {
		const bytes = await readFile(path.join(directorioFotoPerfil(), nombre));
		return {
			bytes,
			tipo: nombre.endsWith(".jpg")
				? "image/jpeg"
				: nombre.endsWith(".png")
					? "image/png"
					: "image/webp",
		};
	} catch {
		throw new NotFoundError();
	}
}
