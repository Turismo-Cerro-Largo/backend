import { NotFoundError } from "../../configuracion/AppError.js";
import * as repository from "./localidades.repository.js";

export async function listar() {
	const localidades = await repository.listarPublicadas();
	const sinCentro = localidades.filter(localidad => localidad.latitud === null || localidad.longitud === null).map(localidad => localidad.nombre);
	const limites = sinCentro.length ? await repository.limitesPublicados(sinCentro) : [];
	const limitesPorNombre = new Map(limites.map(limite => [limite.localidad, limite]));
	return localidades.map((localidad) => ({
		id: localidad.id,
		slug: localidad.slug,
		nombre: localidad.nombre,
		descripcion: localidad.descripcion,
		latitud: localidad.latitud === null ? null : Number(localidad.latitud),
		longitud: localidad.longitud === null ? null : Number(localidad.longitud),
		limites: (() => {
			const limite = limitesPorNombre.get(localidad.nombre);
			return limite && limite._min.latitud !== null && limite._min.longitud !== null && limite._max.latitud !== null && limite._max.longitud !== null
				? [[Number(limite._min.longitud), Number(limite._min.latitud)], [Number(limite._max.longitud), Number(limite._max.latitud)]]
				: null;
		})(),
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
