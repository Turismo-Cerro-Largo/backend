// src/app/categorias/categorias.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { categoria_scheme } from "./categorias.scheme.js";

const app = new Hono();

app.get("/", async (c) => {
	const categorias = await prisma.categoria.findMany({
		orderBy: { id: "asc" },
		select: {
			id: true,
			nombre: true,
			descripcion: true,
			_count: {
				select: {
					eventos: { where: { estado: "PUBLICADO" } },
					ubicaciones: true,
				},
			},
		},
	});

	return c.json({ categorias, total: categorias.length });
});

app.get("/:id", async (c) => {
	const id = Number(c.req.param("id"));

	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();

	const categoria = await prisma.categoria.findUnique({
		where: { id },
		select: {
			id: true,
			nombre: true,
			descripcion: true,
			_count: {
				select: {
					eventos: { where: { estado: "PUBLICADO" } },
					ubicaciones: true,
				},
			},
		},
	});

	if (!categoria) throw new NotFoundError();

	return c.json(categoria);
});

/**
 * Administrador
 */

app.post("/", VerificarSessionRol(["ADMINISTRADOR"]), bodyLimitado(10, "KB"), async (c) => {
	const datos = categoria_scheme.safeParse(await c.req.parseBody());

	if (!datos.success) throw new BadRequestError();

	if (
		await prisma.categoria.findUnique({
			where: { nombre: datos.data.nombre },
			select: { id: true },
		})
	)
		throw new ConflictError();

	return c.json(
		await prisma.categoria.create({
			data: {
				nombre: datos.data.nombre,
				descripcion: datos.data.descripcion,
			},
		}),
		201,
	);
});

app.put("/:id", VerificarSessionRol(["ADMINISTRADOR"]), bodyLimitado(10, "KB"), async (c) => {
	const id = Number(c.req.param("id"));

	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();

	const datos = categoria_scheme.safeParse(await c.req.parseBody());

	if (!datos.success) throw new BadRequestError();

	if (!(await prisma.categoria.findUnique({ where: { id }, select: { id: true } })))
		throw new NotFoundError();

	const nombre_existente = await prisma.categoria.findUnique({
		where: { nombre: datos.data.nombre },
		select: { id: true },
	});

	if (nombre_existente && nombre_existente.id !== id) throw new ConflictError();

	return c.json(
		await prisma.categoria.update({
			where: { id },
			data: {
				nombre: datos.data.nombre,
				descripcion: datos.data.descripcion,
			},
		}),
	);
});

app.delete("/:id", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	const id = Number(c.req.param("id"));

	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();

	const existe = await prisma.categoria.findUnique({
		where: { id },
		select: {
			id: true,
			_count: { select: { eventos: true, ubicaciones: true } },
		},
	});

	if (!existe) throw new NotFoundError();

	if (existe._count.eventos > 0 || existe._count.ubicaciones > 0) throw new ConflictError();

	await prisma.categoria.delete({ where: { id } });

	return c.body(null, 204);
});

export { app as CategoriasRoute };
