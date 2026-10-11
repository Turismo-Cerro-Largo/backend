// src/app/categorias/categorias.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { categoria_scheme } from "./categorias.scheme.js";

const app = new Hono();

// Listar categorias
app.get("/", async (c) => {
	const offset = Number(c.req.query("offset") ?? 0);
	const limit = Number(c.req.query("limit") ?? 10);

	if (
		!Number.isInteger(offset) ||
		offset < 0 ||
		!Number.isInteger(limit) ||
		limit < 1 ||
		limit > 100
	) {
		throw new BadRequestError();
	}

	const [categorias, total] = await prisma.$transaction([
		prisma.categoria.findMany({
			skip: offset,
			take: limit,
			orderBy: { id: "asc" },
			select: {
				id: true,
				nombre: true,
				descripcion: true,
				_count: {
					select: {
						eventos: true,
						ubicaciones: true,
					},
				},
			},
		}),
		prisma.categoria.count(),
	]);

	return c.json({ categorias, total });
});

// Obtener categoria
app.get("/:id", async (c) => {
	const id = Number(c.req.param("id"));

	if (!Number.isSafeInteger(id) || id < 1) {
		throw new BadRequestError();
	}

	const categoria = await prisma.categoria.findUnique({
		where: { id },
		select: {
			id: true,
			nombre: true,
			descripcion: true,
			_count: {
				select: {
					eventos: true,
					ubicaciones: true,
				},
			},
		},
	});

	if (!categoria) throw new NotFoundError();

	return c.json(categoria);
});

// Crear categoria
app.post("/", bodyLimitado(10, "KB"), VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	const datos = categoria_scheme.safeParse(await c.req.parseBody());

	if (!datos.success) throw new BadRequestError();

	const existe = await prisma.categoria.findUnique({
		where: { nombre: datos.data.nombre },
	});

	if (existe) throw new ConflictError();

	const categoria = await prisma.categoria.create({
		data: {
			nombre: datos.data.nombre,
			descripcion: datos.data.descripcion,
		},
	});

	return c.json(categoria, 201);
});

// Actualizar categoria
app.put("/:id", bodyLimitado(10, "KB"), VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	const id = Number(c.req.param("id"));

	if (!Number.isSafeInteger(id) || id < 1) {
		throw new BadRequestError();
	}

	const datos = categoria_scheme.safeParse(await c.req.parseBody());

	if (!datos.success) throw new BadRequestError();

	const existe = await prisma.categoria.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!existe) throw new NotFoundError();

	const nombreExiste = await prisma.categoria.findUnique({
		where: { nombre: datos.data.nombre },
		select: { id: true },
	});

	if (nombreExiste && nombreExiste.id !== id) {
		throw new ConflictError();
	}

	const categoria = await prisma.categoria.update({
		where: { id },
		data: {
			nombre: datos.data.nombre,
			descripcion: datos.data.descripcion,
		},
	});

	return c.json(categoria);
});

// Eliminar categoria
app.delete("/:id", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	const id = Number(c.req.param("id"));

	if (!Number.isSafeInteger(id) || id < 1) {
		throw new BadRequestError();
	}

	const existe = await prisma.categoria.findUnique({
		where: { id },
		select: {
			id: true,
			_count: {
				select: {
					eventos: true,
					ubicaciones: true,
				},
			},
		},
	});

	if (!existe) throw new NotFoundError();

	if (existe._count.eventos > 0 || existe._count.ubicaciones > 0) {
		throw new ConflictError();
	}

	await prisma.categoria.delete({
		where: { id },
	});

	return c.body(null, 204);
});

export { app as CategoriasRoute };
