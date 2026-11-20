import * as localidadRepository from "./localidades.repository.js";
import * as transacciones from "./localidades.admin.repository.js";
import * as ubicacionRepository from "../ubicaciones/ubicaciones.repository.js";
import * as usuarioRepository from "../usuarios/usuarios.repository.js";
import { z } from "zod";
import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import { borrar_publicos } from "../../middleware/Archivos.js";

const formulario = z.object({
	slug: z
		.string()
		.trim()
		.min(2)
		.max(120)
		.regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/),
	nombre: z.string().trim().min(2).max(120),
	descripcion: z.string().trim().max(500).default(""),
	latitud: z.string().trim().default(""),
	longitud: z.string().trim().default(""),
	estado: z.enum(["PUBLICADO", "OCULTADO"]).default("PUBLICADO"),
	quitar_icono: z.enum(["true", "false"]).default("false"),
});

function datos(body: Record<string, unknown>) {
	const parsed = formulario.safeParse(body);
	if (!parsed.success)
		throw new BadRequestError("Revisá el nombre, slug y demás datos de la localidad.");
	const { latitud, longitud, quitar_icono, ...campos } = parsed.data;
	if (Boolean(latitud) !== Boolean(longitud))
		throw new BadRequestError("Completá ambas coordenadas o dejá ambas vacías.");
	const lat = latitud ? Number(latitud) : null;
	const lon = longitud ? Number(longitud) : null;
	if (
		(lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
		(lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))
	)
		throw new BadRequestError("Las coordenadas no son válidas.");
	return {
		...campos,
		descripcion: campos.descripcion || null,
		latitud: lat,
		longitud: lon,
		quitar_icono: quitar_icono === "true",
	};
}

const idNumero = (valor: string) => {
	const id = Number(valor);
	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();
	return id;
};

const esDuplicado = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

const serializar = (localidad: {
	id: number;
	slug: string;
	nombre: string;
	descripcion: string | null;
	latitud: unknown;
	longitud: unknown;
	icono: string | null;
	estado: string;
}) => ({
	...localidad,
	latitud: localidad.latitud === null ? null : Number(localidad.latitud),
	longitud: localidad.longitud === null ? null : Number(localidad.longitud),
	icono: localidad.icono ? "/api/admin/localidades/" + localidad.id + "/icono" : null,
});

export async function listar() {
	const localidades = await localidadRepository.findMany({
		orderBy: [{ nombre: "asc" }, { id: "asc" }],
	});
	return localidades.map(serializar);
}

export async function icono(valorId: string) {
	const localidad = await localidadRepository.findUnique({
		where: { id: idNumero(valorId) },
		select: { icono: true },
	});
	if (!localidad) throw new NotFoundError();
	return localidad.icono;
}

export async function crear(formulario: Record<string, unknown>, archivos: string[]) {
	const entrada = datos(formulario);
	const { quitar_icono: _quitar, ...campos } = entrada;
	const icono = archivos[0] ?? null;
	try {
		const localidad = await localidadRepository.create({ data: { ...campos, icono } });
		return serializar(localidad);
	} catch (error) {
		if (esDuplicado(error)) throw new ConflictError("El nombre o el slug ya existe.");
		throw error;
	}
}

export async function editar(
	valorId: string,
	formulario: Record<string, unknown>,
	archivos: string[],
) {
	const id = idNumero(valorId);
	const anterior = await localidadRepository.findUnique({ where: { id } });
	if (!anterior) throw new NotFoundError();
	const entrada = datos(formulario);
	const { quitar_icono, ...campos } = entrada;
	const nuevoIcono = archivos[0];
	if (quitar_icono && nuevoIcono)
		throw new BadRequestError("Elegí entre quitar o reemplazar el icono.");
	try {
		const localidad = await transacciones.actualizarLocalidad(
			id,
			campos,
			anterior,
			nuevoIcono,
			quitar_icono,
		);
		if (anterior.icono && anterior.icono !== localidad.icono)
			await borrar_publicos([anterior.icono]);
		return serializar(localidad);
	} catch (error) {
		if (esDuplicado(error)) throw new ConflictError("El nombre o el slug ya existe.");
		throw error;
	}
}

export async function eliminar(valorId: string) {
	const id = idNumero(valorId);
	const localidad = await localidadRepository.findUnique({ where: { id } });
	if (!localidad) throw new NotFoundError();
	const [lugares, usuarios] = await Promise.all([
		ubicacionRepository.count({ where: { localidad: localidad.nombre } }),
		usuarioRepository.count({ where: { localidad: localidad.nombre } }),
	]);
	if (lugares || usuarios) throw new ConflictError("Esta localidad está en uso. Podés ocultarla.");
	await localidadRepository.eliminar({ where: { id } });
	if (localidad.icono) await borrar_publicos([localidad.icono]);
	return null;
}
