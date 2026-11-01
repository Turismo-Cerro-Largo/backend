import { readObject } from "../../services/storage.js";
import { NotFoundError } from "../../configuracion/AppError.js";

const nombreValido = (nombre: string) => /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre);

export async function leerFoto(nombre: string | null) {
	if (!nombre || !nombreValido(nombre)) throw new NotFoundError();
	try {
		const bytes = await readObject("privado/perfiles/" + nombre);
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
