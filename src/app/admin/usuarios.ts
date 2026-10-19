// src/app/admin/usuarios.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";

const app = new Hono();

app.use("*", VerificarSessionRol(["ADMINISTRADOR"]), async (c, next) => {
	const sesion = c.get("sesion");
	const id = Number(sesion.id);

	if (sesion.tipo !== "usuario" || !Number.isSafeInteger(id) || id <= 0) {
		throw new ForbiddenError();
	}

	const actual = await prisma.usuario.findUnique({
		where: { id },
		select: { rol: true },
	});

	if (actual?.rol !== "ADMINISTRADOR") {
		throw new ForbiddenError();
	}

	await next();
});

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

app.get("/", async (c) => {
	const buscar = (c.req.query("buscar") || "").trim();
	const departamento = (c.req.query("departamento") || "").trim();
	const rol = c.req.query("rol") || "";

	if (
		buscar.length > 100 ||
		departamento.length > 100 ||
		(rol && rol !== "TURISTA" && rol !== "ADMINISTRADOR")
	) {
		throw new BadRequestError();
	}

	const offset = entero(c.req.query("offset"), 0, 1000000);

	const limit = Math.max(1, entero(c.req.query("limit"), 12, 50));

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
		prisma.usuario.findMany({
			where,
			orderBy: {
				creado_en: "desc",
			},
			skip: offset,
			take: limit,
			select: camposLista,
		}),

		prisma.usuario.count({ where }),

		prisma.usuario.count({
			where: { rol: "TURISTA" },
		}),

		prisma.usuario.count({
			where: { rol: "ADMINISTRADOR" },
		}),

		prisma.usuario.count({
			where: {
				creado_en: {
					gte: new Date(Date.now() - 30 * 86400000),
				},
			},
		}),
	]);

	return c.json({
		usuarios,
		total,
		offset,
		limit,
		resumen: {
			turistas,
			administradores,
			recientes,
		},
	});
});

app.get("/:id/favoritos", async (c) => {
	const id = idValido(c.req.param("id"));

	const offset = entero(c.req.query("offset"), 0, 1000000);

	const limit = Math.max(1, entero(c.req.query("limit"), 12, 50));

	// Verificar que el usuario exista.
	const usuario = await prisma.usuario.findUnique({
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
		prisma.favorito.findMany({
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

		prisma.favorito.count({
			where: {
				id_usuario: id,
			},
		}),
	]);

	return c.json({
		usuario,
		favoritos,
		total,
		offset,
		limit,
	});
});

app.get("/:id", async (c) => {
	const id = idValido(c.req.param("id"));

	const usuario = await prisma.usuario.findUnique({
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

	return c.json(usuario);
});

export { app as AdminUsuariosRoute };
