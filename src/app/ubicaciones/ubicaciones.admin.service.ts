import * as ubicacionRepository from "./ubicaciones.repository.js";
import * as categoriaRepository from "../categorias/categorias.datos.repository.js";
import * as transacciones from "./ubicaciones.admin.repository.js";
import { BadRequestError, NotFoundError, ConflictError } from "../../configuracion/AppError.js";
import { datosSchema_ubicaciones, estadoUbicacionSchema } from "./ubicaciones.admin.scheme.js";

const idNumero = (v: string) => {
	const n = Number(v);

	if (!Number.isSafeInteger(n) || n < 1) {
		throw new BadRequestError();
	}

	return n;
};

const select = {
	id: true,
	nombre: true,
	descripcion: true,
	direccion: true,
	localidad: true,
	telefono: true,
	sitio_web: true,
	horario: true,
	latitud: true,
	longitud: true,
	estado: true,
	creado_en: true,
	id_categoria: true,

	categoria: {
		select: {
			id: true,
			nombre: true,
		},
	},

	recursos: {
		select: {
			id: true,
			uri: true,
			tipo: true,
			orden: true,
		},
		orderBy: { orden: "asc" as const },
	},
} as const;

const normalize = (x: any) => ({
	...x,
	latitud: Number(x.latitud),
	longitud: Number(x.longitud),
});

export async function mapearCarga(archivos: string[]) {
	const nombres = archivos;
	if (!nombres.length) throw new BadRequestError("Seleccioná al menos un archivo.");
	const recursos = nombres.map((nombre) => ({
		uri: "/api/archivos/publicos/" + nombre,
		tipo: /\.(mp4|webm)$/i.test(nombre) ? ("VIDEO" as const) : ("IMAGEN" as const),
	}));
	return { recursos, ...(recursos.length === 1 ? recursos[0] : {}) };
}

export async function listar(query: Record<string, string | undefined>) {
	const offset = Number(query.offset ?? "0");
	const limit = Number(query.limit ?? "12");

	if (
		!Number.isSafeInteger(offset) ||
		offset < 0 ||
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > 50
	) {
		throw new BadRequestError();
	}

	const buscar = (query.buscar ?? "").trim();

	if (buscar.length > 100) {
		throw new BadRequestError();
	}

	const estado = query.estado;

	if (estado && !["PUBLICADO", "OCULTADO"].includes(estado)) {
		throw new BadRequestError();
	}

	const categoria = query.categoria;

	if (categoria && (!Number.isSafeInteger(Number(categoria)) || Number(categoria) < 1)) {
		throw new BadRequestError();
	}

	const where = {
		...(estado
			? {
					estado: estado as "PUBLICADO" | "OCULTADO",
				}
			: {}),

		...(categoria ? { id_categoria: Number(categoria) } : {}),

		...(buscar
			? {
					OR: [
						{ nombre: { contains: buscar, mode: "insensitive" as const } },
						{ localidad: { contains: buscar, mode: "insensitive" as const } },
						{ descripcion: { contains: buscar, mode: "insensitive" as const } },
					],
				}
			: {}),
	};

	const [total, ubicaciones, publicadas] = await Promise.all([
		ubicacionRepository.count({ where }),

		ubicacionRepository.findMany({
			where,
			skip: offset,
			take: limit,
			orderBy: {
				creado_en: "desc",
			},
			select,
		}),

		ubicacionRepository.count({
			where: { estado: "PUBLICADO" },
		}),
	]);

	return {
		total,
		publicadas,
		ubicaciones: ubicaciones.map(normalize),
	};
}

export async function detalle(valorId: string) {
	const u = await ubicacionRepository.findUnique({
		where: {
			id: idNumero(valorId),
		},
		select,
	});

	if (!u) {
		throw new NotFoundError();
	}

	return normalize(u);
}

async function comprobarCategoria(id: number) {
	const categoria = await categoriaRepository.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!categoria) {
		throw new BadRequestError("La categoría seleccionada no existe.");
	}
}

function recursoData(
	recursos: {
		uri: string;
		tipo: "IMAGEN" | "VIDEO";
	}[],
) {
	return recursos.map((r, orden) => ({
		uri: r.uri,
		tipo: r.tipo,
		orden,
	}));
}

export async function crear(json: unknown) {
	const result = datosSchema_ubicaciones.safeParse(json);

	if (!result.success) {
		return {
			datos: {
				error: "Datos inválidos",
				detalles: result.error.flatten(),
			},
			status: 400 as const,
		};
	}

	const { recursos, ...datos } = result.data;

	await comprobarCategoria(datos.id_categoria);

	const nueva = await ubicacionRepository.create({
		data: {
			...datos,
			recursos: {
				create: recursoData(recursos),
			},
		},
	});

	return {
		datos: {
			id: nueva.id,
		},
		status: 201 as const,
	};
}

export async function editar(valorId: string, json: unknown) {
	const id = idNumero(valorId);

	const result = datosSchema_ubicaciones.safeParse(json);

	if (!result.success) {
		return {
			datos: {
				error: "Datos inválidos",
				detalles: result.error.flatten(),
			},
			status: 400 as const,
		};
	}

	const existe = await ubicacionRepository.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!existe) {
		throw new NotFoundError();
	}

	const { recursos, ...datos } = result.data;

	await comprobarCategoria(datos.id_categoria);

	await transacciones.reemplazarUbicacion(id, datos, recursoData(recursos));

	return { datos: { ok: true }, status: 200 as const };
}

export async function cambiarEstado(valorId: string, json: unknown) {
	const id = idNumero(valorId);

	const parsed = estadoUbicacionSchema.safeParse(json);

	if (!parsed.success) {
		throw new BadRequestError();
	}

	const existe = await ubicacionRepository.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!existe) {
		throw new NotFoundError();
	}

	const u = await ubicacionRepository.update({
		where: { id },
		data: parsed.data,
		select: {
			id: true,
			estado: true,
		},
	});

	return u;
}

export async function eliminar(valorId: string) {
	const id = idNumero(valorId);

	const u = await ubicacionRepository.findUnique({
		where: { id },
		select: {
			_count: {
				select: {
					comentarios: true,
					favoritos: true,
				},
			},
		},
	});

	if (!u) {
		throw new NotFoundError();
	}

	if (u._count.comentarios || u._count.favoritos) {
		throw new ConflictError();
	}

	await transacciones.borrarUbicacion(id);

	return null;
}
