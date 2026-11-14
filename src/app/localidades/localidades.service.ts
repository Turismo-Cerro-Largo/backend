import { NotFoundError } from "../../configuracion/AppError.js";
import * as repository from "./localidades.repository.js";

export async function listar() {
	const localidades = await repository.listarPublicadas();
	return localidades.map((localidad) => ({
		id: localidad.id,
		slug: localidad.slug,
		nombre: localidad.nombre,
		descripcion: localidad.descripcion,
		latitud: localidad.latitud === null ? null : Number(localidad.latitud),
		longitud: localidad.longitud === null ? null : Number(localidad.longitud),
		icono: localidad.icono
			? "/api/localidades/" + encodeURIComponent(localidad.slug) + "/icono"
			: null,
	}));
}

export async function obtenerIcono(slug: string) {
	const localidad = await repository.buscarIcono(slug);
	if (localidad?.estado !== "PUBLICADO") throw new NotFoundError();
	return localidad.icono;
}
