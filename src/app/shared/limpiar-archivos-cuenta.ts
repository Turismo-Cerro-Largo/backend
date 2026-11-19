import { borrarArchivos, borrarFotoPerfil } from "../../services/archivos.service.js";

const nombres = (uris: string[]) => uris.flatMap(uri => {
	const nombre = /(?:^|\/)([a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|gif|mp4|webm))$/i.exec(uri)?.[1];
	return nombre ? [nombre] : [];
});

export async function limpiarArchivosCuenta(datos: { foto?: string | null; documentos?: string[]; recursos: string[] }) {
	await Promise.all([
		borrarFotoPerfil(datos.foto ?? null),
		borrarArchivos("privados", nombres(datos.documentos ?? [])),
		borrarArchivos("publicos", nombres(datos.recursos)),
	]);
}
