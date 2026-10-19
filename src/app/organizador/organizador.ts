// src/app/organizador/organizador.ts
import { Hono } from "hono";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../configuracion/AppError.js";
import { prisma } from "../../configuracion/db.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import { camposPerfil } from "./organizador.consts.js";
import { datosPerfil, organizador_estado_scheme } from "./organizador.scheme.js";
import { EventosRoute } from "./eventos.js";

const app = new Hono();

app.get("/", VerificarSessionRol(["ORGANIZADOR"]), async (c) => {
	const organizador = await prisma.organizador.findUnique({
		where: { id: Number(c.get("sesion").id) },
		select: camposPerfil,
	});

	if (!organizador) throw new UnauthorizedError();

	return c.json(organizador);
});

app.put("/", VerificarSessionRol(["ORGANIZADOR"]), bodyLimitado(8, "KB"), async (c) => {
	const datos = datosPerfil.safeParse(await c.req.json().catch(() => null));

	if (!datos.success) throw new BadRequestError("Revisá los datos ingresados.");

	const actual = await prisma.organizador.findUnique({
		where: { id: Number(c.get("sesion").id) },
		select: { estado: true },
	});

	if (!actual) throw new UnauthorizedError();

	return c.json(
		await prisma.organizador.update({
			where: { id: Number(c.get("sesion").id) },
			data: {
				nombre_organizacion: datos.data.nombre_organizacion,
				departamento: datos.data.departamento,
				telefono: datos.data.telefono,
				sitio_web: datos.data.sitio_web || null,
				...(actual.estado === "RECHAZADO"
					? { estado: "PENDIENTE_REVISION" as const, motivo_rechazo: null }
					: {}),
			},
			select: camposPerfil,
		}),
	);
});

app.route("/", EventosRoute);

app.get("/lista", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	if (
		c.req.query("estado") &&
		!["PENDIENTE_REVISION", "APROBADO", "RECHAZADO"].includes(c.req.query("estado") as string)
	)
		throw new BadRequestError();

	return c.json(
		await prisma.organizador.findMany({
			where: c.req.query("estado") ? { estado: c.req.query("estado") as import("../../configuracion/generated/prisma/enums.js").EstadoOrganizador } : {},
			skip: Number(c.req.query("offset") ?? 0),
			take: Math.min(Number(c.req.query("limit") ?? 10), 50),
			orderBy: { creado_en: "desc" },
			select: { ...camposPerfil, documentos: { select: { tipo: true, uri: true } } },
		}),
	);
});

app.get("/:id", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	const id = Number(c.req.param("id"));
	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();
	const organizador = await prisma.organizador.findUnique({
		where: { id },
		select: {
			...camposPerfil,
			motivo_rechazo: true,
			documentos: { select: { tipo: true, uri: true } },
		},
	});
	if (!organizador) throw new NotFoundError();
	return c.json(organizador);
});

app.patch("/:id/estado", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	if (!Number.isInteger(Number(c.req.param("id"))) || Number(c.req.param("id")) < 1)
		throw new BadRequestError();

	const datos = organizador_estado_scheme.safeParse(await c.req.json().catch(() => null));

	if (!datos.success) throw new BadRequestError();

	if (
		!(await prisma.organizador.findUnique({
			where: { id: Number(c.req.param("id")) },
			select: { id: true },
		}))
	)
		throw new NotFoundError();

	return c.json(
		await prisma.organizador.update({
			where: { id: Number(c.req.param("id")) },
			data: {
				estado: datos.data.estado,
				motivo_rechazo: datos.data.estado === "RECHAZADO" ? datos.data.motivo_rechazo : null,
			},
			select: { id: true, estado: true, motivo_rechazo: true },
		}),
	);
});

export { app as OrganizadorRoute };