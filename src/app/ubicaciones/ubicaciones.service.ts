import * as ubicacionRepository from "./ubicaciones.repository.js";

export async function listarPorCategoria(query: Record<string, string | undefined>) {
	const categoria = query.categoria?.trim();

	if (!categoria || categoria.length > 100) {
		return { datos: { error: "Debés indicar una categoría" }, status: 400 as const };
	}

	const ubicaciones = await ubicacionRepository.findMany({
		where: {
			estado: "PUBLICADO",
			categoria: {
				is: {
					nombre: categoria,
				},
			},
		},
		select: {
			id: true,
			nombre: true,
			descripcion: true,
			localidad: true,
			direccion: true,
			telefono: true,
			sitio_web: true,
			horario: true,
			latitud: true,
			longitud: true,
			recursos: {
				where: {
					tipo: "IMAGEN",
				},
				orderBy: {
					orden: "asc",
				},
				take: 1,
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			nombre: "asc",
		},
	});

	const resultado = ubicaciones.map(({ recursos, latitud, longitud, ...lugar }) => ({
		...lugar,
		latitud: Number(latitud),
		longitud: Number(longitud),
		imagen: recursos[0] ? `/api/recursos/${recursos[0].id}` : null,
	}));

	return { datos: resultado, status: 200 as const };
}
