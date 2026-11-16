import { leerBytes } from "../../services/storage.service.js";
import { NotFoundError } from "../../configuracion/AppError.js";

export async function responderIconoLocalidad(nombre: string | null) {
	if (!nombre || !/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(nombre)) throw new NotFoundError();
	const contenido = await leerBytes(`publicos/${nombre}`);
	if (!contenido) throw new NotFoundError();
	const tipo = nombre.endsWith(".png")
		? "image/png"
		: nombre.endsWith(".webp")
			? "image/webp"
			: "image/jpeg";
	return new Response(new Uint8Array(contenido), {
		headers: {
			"Content-Type": tipo,
			"Cache-Control": "no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
