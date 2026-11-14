import * as usuarioRepository from "./usuarios.repository.js";
import * as favoritoRepository from "../favoritos/favoritos.repository.js";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";

const entero = (v: string | undefined, porDefecto: number, max: number) => {
	if (v === undefined) return porDefecto;

	const n = Number(v);

	if (!Number.isSafeInteger(n) || n < 0 || n > max) {
		throw new BadRequestError();
	}

	return n;
};

const idValido = (valor: string) => {
	const id = Number(valor);

	if (!Number.isSafeInteger(id) || id < 1) {
		throw new BadRequestError("ID de usuario inválido.");
	}

	return id;
};

const camposLista = {
	id: true,
	nombres: true,
	apellidos: true,
	email: true,
	departamento: true,
	rol: true,
	creado_en: true,
	_count: {
		select: {
			comentarios: true,
			favoritos: true,
		},
	},
} as const;

export async function listar(query: Record<string, string | undefined>) {
	const buscar = (query.buscar || "").trim();
	const departamento = (query.departamento || "").trim();
	const rol = query.rol || "";

	if (
		buscar.length > 100 ||
		departamento.length > 100 ||
		(rol && rol !== "TURISTA" && rol !== "ADMINISTRADOR")
	) {
		throw new BadRequestError();
	}

	const offset = entero(query.offset, 0, 1000000);

	const limit = Math.max(1, entero(query.limit, 12, 50));

	const where = {
		...(rol
			? {
					rol: rol as "TURISTA" | "ADMINISTRADOR",
				}
			: {}),

		...(departamento ? { departamento } : {}),

		...(buscar
			? {
					OR: [
						{
							nombres: {
								contains: buscar,
							},
						},
						{
							apellidos: {
								contains: buscar,
							},
						},
						{
							email: {
								contains: buscar,
							},
						},
					],
				}
			: {}),
	};

	const [usuarios, total, turistas, administradores, recientes] = await Promise.all([
		usuarioRepository.findMany({
			where,
			orderBy: {
				creado_en: "desc",
			},
			skip: offset,
			take: limit,
			select: camposLista,
		}),

		usuarioRepository.count({ where }),

		usuarioRepository.count({
			where: { rol: "TURISTA" },
		}),

		usuarioRepository.count({
			where: { rol: "ADMINISTRADOR" },
		}),

		usuarioRepository.count({
			where: {
				creado_en: {
					gte: new Date(Date.now() - 30 * 86400000),
				},
			},
		}),
	]);

	return {
		usuarios,
		total,
		offset,
		limit,
		resumen: {
			turistas,
			administradores,
			recientes,
		},
	};
}

export async function favoritos(valorId: string, query: Record<string, string | undefined>) {
	const id = idValido(valorId);

	const offset = entero(query.offset, 0, 1000000);

	const limit = Math.max(1, entero(query.limit, 12, 50));

	// Verificar que el usuario exista.
	const usuario = await usuarioRepository.findUnique({
		where: { id },
		select: {
			id: true,
			nombres: true,
			apellidos: true,
			email: true,
		},
	});

	if (!usuario) {
		throw new NotFoundError();
	}

	// Obtener favoritos y total.
	const [favoritos, total] = await Promise.all([
		favoritoRepository.findMany({
			where: {
				id_usuario: id,
			},

			orderBy: [{ creado_en: "desc" }, { id: "desc" }],

			skip: offset,
			take: limit,

			select: {
				id: true,
				creado_en: true,

				ubicacion: {
					select: {
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

						categoria: {
							select: {
								id: true,
								nombre: true,
							},
						},

						recursos: {
							select: {
								uri: true,
								tipo: true,
								orden: true,
							},
							orderBy: {
								orden: "asc",
							},
						},
					},
				},
			},
		}),

		favoritoRepository.count({
			where: {
				id_usuario: id,
			},
		}),
	]);

	return {
		usuario,
		favoritos,
		total,
		offset,
		limit,
	};
}

export async function detalle(valorId: string) {
	const id = idValido(valorId);

	const usuario = await usuarioRepository.findUnique({
		where: { id },

		select: {
			...camposLista,
			telefono: true,
			fecha_nacimiento: true,
			genero: true,
			cedula: true,
		},
	});

	if (!usuario) {
		throw new NotFoundError();
	}

	return usuario;
}
