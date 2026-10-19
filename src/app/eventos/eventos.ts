import { listarEventos, detalleEvento } from "../catalogo/catalogo.js";
// src/app/eventos/eventos.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import { eventos_estado_scheme, eventos_formulario_scheme } from "./eventos.scheme.js";
import { ArchivosPublicos, borrar_publicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import type { EstadoEvento } from "../../configuracion/generated/prisma/enums.js";

const app = new Hono();

const esta_aprobado = async (id: number) =>
	Boolean(
		await prisma.organizador.findFirst({ where: { id, estado: "APROBADO" }, select: { id: true } }),
	);

app.get("/", listarEventos);

app.get("/status", VerificarSessionRol(["ORGANIZADOR"]), async (c) => {
	if (!(await esta_aprobado(Number(c.get("sesion").id)))) throw new UnauthorizedError();

	const [total, pendientes, publicados, borradores, ultimos] = await Promise.all([
		prisma.evento.count({ where: { id_organizador: Number(c.get("sesion").id) } }),
		prisma.evento.count({
			where: { id_organizador: Number(c.get("sesion").id), estado: "PENDIENTE_REVISION" },
		}),
		prisma.evento.count({
			where: { id_organizador: Number(c.get("sesion").id), estado: "PUBLICADO" },
		}),
		prisma.evento.count({
			where: { id_organizador: Number(c.get("sesion").id), estado: "BORRADOR" },
		}),
		prisma.evento.findMany({
			where: { id_organizador: Number(c.get("sesion").id) },
			orderBy: { creado_en: "desc" },
			take: 5,
			select: { id: true, titulo: true, inicio: true, estado: true },
		}),
	]);

	return c.json({ total, pendientes, publicados, borradores, ultimos });
});

app.get(
	"/organizador/:id_organizador",
	VerificarSessionRol(["ORGANIZADOR", "ADMINISTRADOR"]),
	async (c) => {
		if (
			c.get("sesion").rol !== "ADMINISTRADOR" &&
			!(await esta_aprobado(Number(c.get("sesion").id)))
		)
			throw new UnauthorizedError();

		if (
			!Number.isInteger(Number(c.req.param("id_organizador"))) ||
			Number(c.req.param("id_organizador")) < 1
		)
			throw new BadRequestError();

		if (
			c.get("sesion").rol !== "ADMINISTRADOR" &&
			Number(c.req.param("id_organizador")) !== Number(c.get("sesion").id)
		)
			throw new NotFoundError();

		if (
			c.req.query("estado") &&
			![
				"BORRADOR",
				"PENDIENTE_REVISION",
				"PUBLICADO",
				"RECHAZADO",
				"CANCELADO",
				"FINALIZADO",
			].includes(c.req.query("estado") as string)
		)
			throw new BadRequestError();

		const eventos = await prisma.evento.findMany({
			where: {
				id_organizador: Number(c.req.param("id_organizador")),
				...(c.req.query("estado") ? { estado: c.req.query("estado") as EstadoEvento } : {}),
			},
			skip: Number(c.req.query("offset") ?? 0),
			take: Math.min(Number(c.req.query("limit") ?? 10), 50),
			orderBy: { creado_en: "desc" },
			include: {
				categoria: true,
				recursos: { select: { uri: true, tipo: true, orden: true }, orderBy: { orden: "asc" } },
			},
		});

		return c.json(eventos);
	},
);

app.get("/:id", detalleEvento);

app.post(
	"/",
	VerificarSessionRol(["ORGANIZADOR"]),
	bodyLimitado(20, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 8),
	async (c) => {
		try {
			if (!(await esta_aprobado(Number(c.get("sesion").id)))) throw new UnauthorizedError();

			const datos = eventos_formulario_scheme.safeParse(await c.req.parseBody({ all: true }));

			if (!datos.success) throw new BadRequestError();

			const evento = await prisma.evento.create({
				data: {
					titulo: datos.data.titulo,
					descripcion: datos.data.descripcion,
					inicio: new Date(datos.data.inicio),
					fin: datos.data.fin ? new Date(datos.data.fin) : null,
					lugar_evento:
						[datos.data.localidad, datos.data.direccion].filter(Boolean).join(", ") || null,
					latitud: datos.data.latitud || null,
					longitud: datos.data.longitud || null,
					es_gratuito: datos.data.es_gratuito === "true",
					precio: datos.data.es_gratuito === "true" ? null : datos.data.precio || null,
					contacto:
						[datos.data.telefono, datos.data.correo, datos.data.redes]
							.filter(Boolean)
							.join(" | ") || null,
					estado: datos.data.accion === "revision" ? "PENDIENTE_REVISION" : "BORRADOR",
					id_categoria: datos.data.id_categoria,
					id_organizador: Number(c.get("sesion").id),
					recursos: {
						createMany: {
							data: c.get("recursos").map((uri, orden) => ({ uri: `/publicos/${uri}`, orden })),
						},
					},
				},
				include: { recursos: { orderBy: { orden: "asc" } } },
			});

			return c.json(evento, 201);
		} catch (e) {
			await borrar_publicos(c.get("recursos"));

			throw e;
		}
	},
);

app.put(
	"/:id",
	VerificarSessionRol(["ORGANIZADOR"]),
	bodyLimitado(20, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 8),
	async (c) => {
		try {
			if (!(await esta_aprobado(Number(c.get("sesion").id)))) throw new UnauthorizedError();

			if (!Number.isInteger(Number(c.req.param("id"))) || Number(c.req.param("id")) < 1)
				throw new BadRequestError();

			const datos = eventos_formulario_scheme.safeParse(await c.req.parseBody({ all: true }));

			if (!datos.success) throw new BadRequestError();

			const existente = await prisma.evento.findFirst({
				where: { id: Number(c.req.param("id")), id_organizador: Number(c.get("sesion").id) },
				select: { estado: true, _count: { select: { recursos: true } } },
			});

			if (!existente) throw new NotFoundError();

			if (!["BORRADOR", "RECHAZADO"].includes(existente.estado)) throw new BadRequestError();

			const evento = await prisma.evento.update({
				where: { id: Number(c.req.param("id")) },
				data: {
					titulo: datos.data.titulo,
					descripcion: datos.data.descripcion,
					inicio: new Date(datos.data.inicio),
					fin: datos.data.fin ? new Date(datos.data.fin) : null,
					lugar_evento:
						[datos.data.localidad, datos.data.direccion].filter(Boolean).join(", ") || null,
					latitud: datos.data.latitud || null,
					longitud: datos.data.longitud || null,
					es_gratuito: datos.data.es_gratuito === "true",
					precio: datos.data.es_gratuito === "true" ? null : datos.data.precio || null,
					contacto:
						[datos.data.telefono, datos.data.correo, datos.data.redes]
							.filter(Boolean)
							.join(" | ") || null,
					estado: datos.data.accion === "revision" ? "PENDIENTE_REVISION" : "BORRADOR",
					motivo_rechazo: null,
					id_categoria: datos.data.id_categoria,
					recursos: {
						createMany: {
							data: c
								.get("recursos")
								.map((uri, orden) => ({
									uri: `/publicos/${uri}`,
									orden: existente._count.recursos + orden,
								})),
						},
					},
				},
				include: { recursos: { orderBy: { orden: "asc" } } },
			});

			return c.json(evento);
		} catch (e) {
			await borrar_publicos(c.get("recursos"));

			throw e;
		}
	},
);

app.delete("/:id", VerificarSessionRol(["ORGANIZADOR"]), async (c) => {
	if (!(await esta_aprobado(Number(c.get("sesion").id)))) throw new UnauthorizedError();

	if (!Number.isInteger(Number(c.req.param("id"))) || Number(c.req.param("id")) < 1)
		throw new BadRequestError();

	const { count } = await prisma.evento.deleteMany({
		where: { id: Number(c.req.param("id")), id_organizador: Number(c.get("sesion").id) },
	});

	if (count === 0) throw new NotFoundError();

	return c.body(null, 204);
});

/**
 * Administrador
 */

app.patch("/:id/estado", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	if (!Number.isInteger(Number(c.req.param("id"))) || Number(c.req.param("id")) < 1)
		throw new BadRequestError();

	const datos = eventos_estado_scheme.safeParse(await c.req.json().catch(() => null));

	if (!datos.success) throw new BadRequestError();

	if (
		!(await prisma.evento.findUnique({
			where: { id: Number(c.req.param("id")) },
			select: { id: true },
		}))
	)
		throw new NotFoundError();

	const evento = await prisma.evento.update({
		where: { id: Number(c.req.param("id")) },
		data: {
			estado: datos.data.estado,
			motivo_rechazo: datos.data.estado === "RECHAZADO" ? datos.data.motivo_rechazo : null,
		},
		select: { id: true, estado: true, motivo_rechazo: true, actualizado_en: true },
	});

	return c.json(evento);
});

export { app as EventosRoute };
