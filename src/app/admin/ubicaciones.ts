// src/app/admin/ubicaciones.ts

import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { ArchivosPublicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import {
	BadRequestError,
	NotFoundError,
	ConflictError,
} from "../../configuracion/AppError.js";
import { datosSchema_ubicaciones, estadoUbicacionSchema } from "./ubicaciones.scheme.js";

const app = new Hono();

// Todas las rutas requieren una sesión de administrador.
app.use("*", RequerirAdministrador);

/**
 * VALIDACIONES
 */

const idNumero = (v: string) => {
	const n = Number(v);

	if (!Number.isSafeInteger(n) || n < 1) {
		throw new BadRequestError();
	}

	return n;
};



/**
 * CAMPOS DE CONSULTA
 */

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

app.post(
	"/recursos/upload",
	bodyLimitado(82, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"], 80, 20),
	(c) => {
		const nombres = c.get("recursos");
		if (!nombres.length) throw new BadRequestError("Seleccioná al menos un archivo.");
		const recursos = nombres.map((nombre) => ({
			uri: '/api/archivos/publicos/' + nombre,
			tipo: /\.(mp4|webm)$/i.test(nombre) ? "VIDEO" as const : "IMAGEN" as const,
		}));
		return c.json({ recursos, ...(recursos.length === 1 ? recursos[0] : {}) }, 201);
	},
);
app.get("/", async (c) => {
	const offset = Number(c.req.query("offset") ?? "0");
	const limit = Number(c.req.query("limit") ?? "12");

	if (
		!Number.isSafeInteger(offset) ||
		offset < 0 ||
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > 50
	) {
		throw new BadRequestError();
	}

	const buscar = (c.req.query("buscar") ?? "").trim();

	if (buscar.length > 100) {
		throw new BadRequestError();
	}

	const estado = c.req.query("estado");

	if (
		estado &&
		!["PUBLICADO", "OCULTADO"].includes(estado)
	) {
		throw new BadRequestError();
	}

	const categoria = c.req.query("categoria");

	if (
		categoria &&
		(!Number.isSafeInteger(Number(categoria)) ||
			Number(categoria) < 1)
	) {
		throw new BadRequestError();
	}

	const where = {
		...(estado
			? {
				estado: estado as
					| "PUBLICADO"
					| "OCULTADO",
			}
			: {}),

		...(categoria
			? { id_categoria: Number(categoria) }
			: {}),

		...(buscar
			? {
				OR: [
					{ nombre: { contains: buscar } },
					{ localidad: { contains: buscar } },
					{ descripcion: { contains: buscar } },
				],
			}
			: {}),
	};

	const [total, ubicaciones, publicadas] =
		await Promise.all([
			prisma.ubicacion.count({ where }),

			prisma.ubicacion.findMany({
				where,
				skip: offset,
				take: limit,
				orderBy: {
					creado_en: "desc",
				},
				select,
			}),

			prisma.ubicacion.count({
				where: { estado: "PUBLICADO" },
			}),
		]);

	return c.json({
		total,
		publicadas,
		ubicaciones: ubicaciones.map(normalize),
	});
});

app.get("/:id", async (c) => {
	const u = await prisma.ubicacion.findUnique({
		where: {
			id: idNumero(c.req.param("id")),
		},
		select,
	});

	if (!u) {
		throw new NotFoundError();
	}

	return c.json(normalize(u));
});

async function comprobarCategoria(id: number) {
	const categoria = await prisma.categoria.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!categoria) {
		throw new BadRequestError(
			"La categoría seleccionada no existe.",
		);
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

app.post("/", async (c) => {
	const result = datosSchema_ubicaciones.safeParse(
		await c.req.json().catch(() => null),
	);

	if (!result.success) {
		return c.json(
			{
				error: "Datos inválidos",
				detalles: result.error.flatten(),
			},
			400,
		);
	}

	const { recursos, ...datos } = result.data;

	await comprobarCategoria(datos.id_categoria);

	const nueva = await prisma.ubicacion.create({
		data: {
			...datos,
			recursos: {
				create: recursoData(recursos),
			},
		},
	});

	return c.json(
		{
			id: nueva.id,
		},
		201,
	);
});

app.put("/:id", async (c) => {
	const id = idNumero(c.req.param("id"));

	const result = datosSchema_ubicaciones.safeParse(
		await c.req.json().catch(() => null),
	);

	if (!result.success) {
		return c.json(
			{
				error: "Datos inválidos",
				detalles: result.error.flatten(),
			},
			400,
		);
	}

	const existe = await prisma.ubicacion.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!existe) {
		throw new NotFoundError();
	}

	const { recursos, ...datos } = result.data;

	await comprobarCategoria(datos.id_categoria);

	await prisma.$transaction(async (tx) => {
		await tx.recurso.deleteMany({
			where: {
				id_ubicacion: id,
			},
		});

		await tx.ubicacion.update({
			where: { id },
			data: {
				...datos,
				recursos: {
					create: recursoData(recursos),
				},
			},
		});
	});

	return c.json({ ok: true });
});

app.patch("/:id/estado", async (c) => {
	const id = idNumero(c.req.param("id"));

	const parsed = estadoUbicacionSchema.safeParse(
			await c.req.json().catch(() => null),
		);

	if (!parsed.success) {
		throw new BadRequestError();
	}

	const existe = await prisma.ubicacion.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!existe) {
		throw new NotFoundError();
	}

	const u = await prisma.ubicacion.update({
		where: { id },
		data: parsed.data,
		select: {
			id: true,
			estado: true,
		},
	});

	return c.json(u);
});

/**
 * ELIMINAR UBICACIÓN
 *
 * DELETE /api/admin/ubicaciones/:id
 */

app.delete("/:id", async (c) => {
	const id = idNumero(c.req.param("id"));

	const u = await prisma.ubicacion.findUnique({
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

	if (
		u._count.comentarios ||
		u._count.favoritos
	) {
		throw new ConflictError();
	}

	await prisma.$transaction(async (tx) => {
		await tx.recurso.deleteMany({
			where: {
				id_ubicacion: id,
			},
		});

		await tx.ubicacion.delete({
			where: { id },
		});
	});

	return c.body(null, 204);
});

export { app as AdminUbicacionesRoute };
