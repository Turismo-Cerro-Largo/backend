import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";

const directorio = () => path.resolve(process.env.TURISTA_PHOTO_DIR || "privado/perfiles");
const nombreValido = (nombre: string) => /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre);

export async function guardarFoto(file: unknown) {
	if (!(file instanceof File) || file.size < 12 || file.size > 3 * 1024 * 1024) {
		throw new BadRequestError("Elegí una imagen JPG, PNG o WebP de hasta 3 MB.");
	}
	const contenido = Buffer.from(await file.arrayBuffer());
	const tipos: Record<string, [string, boolean]> = {
		"image/jpeg": ["jpg", contenido[0] === 255 && contenido[1] === 216 && contenido[2] === 255],
		"image/png": [
			"png",
			contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
		],
		"image/webp": [
			"webp",
			contenido.toString("ascii", 0, 4) === "RIFF" && contenido.toString("ascii", 8, 12) === "WEBP",
		],
	};
	const tipo = tipos[file.type];
	if (!tipo?.[1]) throw new BadRequestError("El archivo no tiene un formato de imagen permitido.");
	const nombre = `${randomUUID()}.${tipo[0]}`;
	await mkdir(directorio(), { recursive: true });
	await writeFile(path.join(directorio(), nombre), contenido, { flag: "wx", mode: 0o600 });
	return nombre;
}

export async function borrarFoto(nombre: string | null) {
	if (nombre && nombreValido(nombre)) {
		await unlink(path.join(directorio(), nombre)).catch((error) => {
			if (error.code !== "ENOENT") console.error("No se pudo limpiar una foto de perfil anterior.");
		});
	}
}

export async function leerFoto(nombre: string | null) {
	if (!nombre || !nombreValido(nombre)) throw new NotFoundError();
	try {
		const bytes = await readFile(path.join(directorio(), nombre));
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
