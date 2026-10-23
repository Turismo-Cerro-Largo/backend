import type { z } from "zod";
import { ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import { leerFoto } from "./fotos.js";
import { borrarFotoPerfil } from "../../services/archivos.service.js";
import { perfilSchema, valoracionSchema } from "./turista.schema.js";
import { turistaRepository as repo } from "./turista.repository.js";

type DatosPerfil = z.infer<typeof perfilSchema>;
type DatosValoracion = z.infer<typeof valoracionSchema>;

function respuestaPerfil(perfil: Awaited<ReturnType<typeof repo.perfil>>) {
	const { foto_perfil, ...datos } = perfil;
	return {
		...datos,
		foto: foto_perfil ? "/api/turista/foto?v=" + encodeURIComponent(foto_perfil) : null,
	};
}

async function exigirLugarPublicado(id: number) {
	if (!(await repo.lugarPublicado(id))) throw new NotFoundError("Este lugar no está disponible.");
}

export const turistaService = {
	async perfil(id: number) {
		return respuestaPerfil(await repo.perfil(id));
	},
	async editarPerfil(id: number, datos: DatosPerfil) {
		const resultado = await repo.actualizarPerfil(id, datos);
		if (!resultado.count)
			throw new ConflictError("La fecha de nacimiento o el género ya están registrados. Recargá el perfil; estos datos solo se pueden completar una vez.");
		return respuestaPerfil(await repo.perfil(id));
	},
	async foto(id: number) {
		const perfil = await repo.perfil(id);
		return leerFoto(perfil.foto_perfil);
	},
	async cambiarFoto(id: number, nombre: string) {
		const previo = await repo.perfil(id);
		const cambio = await repo.cambiarFoto(id, previo.foto_perfil, nombre);
		if (cambio.count !== 1)
			throw new ConflictError("La foto cambió en otra pestaña. Recargá e intentá nuevamente.");
		await borrarFotoPerfil(previo.foto_perfil);
		return respuestaPerfil({ ...previo, foto_perfil: nombre });
	},
	async borrarFoto(id: number) {
		const previo = await repo.perfil(id);
		const cambio = await repo.cambiarFoto(id, previo.foto_perfil, null);
		if (cambio.count !== 1)
			throw new ConflictError("La foto cambió en otra pestaña. Recargá e intentá nuevamente.");
		await borrarFotoPerfil(previo.foto_perfil);
		return respuestaPerfil(await repo.perfil(id));
	},
	async favoritos(id: number) {
		const favoritos = await repo.favoritos(id);
		return {
			favoritos: favoritos.map((favorito) => ({
				id_ubicacion: favorito.id_ubicacion,
				creado_en: favorito.creado_en,
				lugar: favorito.ubicacion.estado === "PUBLICADO" ? favorito.ubicacion : null,
			})),
		};
	},
	async guardarFavorito(idUsuario: number, idUbicacion: number) {
		await exigirLugarPublicado(idUbicacion);
		try {
			await repo.guardarFavorito(idUsuario, idUbicacion);
		} catch (error) {
			if ((error as { code?: string }).code !== "P2002") throw error;
		}
		return { guardado: true };
	},
	async borrarFavorito(idUsuario: number, idUbicacion: number) {
		await repo.borrarFavorito(idUsuario, idUbicacion);
		return { guardado: false };
	},
	async valoraciones(id: number) {
		const valoraciones = await repo.valoraciones(id);
		return {
			valoraciones: valoraciones.map((valoracion) => ({
				...valoracion,
				ubicacion: valoracion.ubicacion.estado === "PUBLICADO" ? valoracion.ubicacion : null,
			})),
		};
	},
	async borrarValoracion(idUsuario: number, idValoracion: number) {
		const resultado = await repo.borrarValoracionPendiente(idUsuario, idValoracion);
		if (!resultado.count)
			throw new ConflictError("Solo podés eliminar tus valoraciones pendientes. Actualizá la página para ver su estado.");
		return { eliminado: true };
	},
	async estadoLugar(idUsuario: number, idUbicacion: number) {
		await exigirLugarPublicado(idUbicacion);
		return repo.estadoLugar(idUsuario, idUbicacion);
	},
	async crearValoracion(idUsuario: number, idUbicacion: number, datos: DatosValoracion) {
		await exigirLugarPublicado(idUbicacion);
		try {
			return await repo.crearValoracion(idUsuario, idUbicacion, datos);
		} catch (error) {
			if ((error as { code?: string }).code === "P2002")
				throw new ConflictError("Ya enviaste una valoración para este lugar.");
			throw error;
		}
	},
};
