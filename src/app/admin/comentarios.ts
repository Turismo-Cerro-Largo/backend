// src/app/admin/comentarios.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import type { EstadoComentario } from "../../configuracion/generated/prisma/enums.js";

const app = new Hono();
const estados = ["PENDIENTE_REVISION", "PUBLICADO", "OCULTADO"] as const;
const esEstado = (value: unknown): value is EstadoComentario =>
	typeof value === "string" && estados.some((e) => e === value);
const idNumerico = (value: string) => {
	const n = Number(value);
	if (!Number.isSafeInteger(n) || n <= 0) throw new BadRequestError();
	return n;
};
const parametro = (v: string | undefined, base: number, max: number) => {
	if (v === undefined) return base;
	const n = Number(v);
	if (!Number.isSafeInteger(n) || n < 0 || n > max) throw new BadRequestError();
	return n;
};

app.use("*", VerificarSessionRol(["ADMINISTRADOR"]));
app.use("*", async (c, next) => {
	const sesion = c.get("sesion");
	const id = Number(sesion.id);
	if (sesion.tipo !== "usuario" || !Number.isSafeInteger(id) || id <= 0) throw new ForbiddenError();
	const cuenta = await prisma.usuario.findUnique({ where: { id }, select: { rol: true } });
	if (cuenta?.rol !== "ADMINISTRADOR") throw new ForbiddenError();
	await next();
});

const relaciones = {
	usuario: { select: { id: true, nombres: true, apellidos: true, email: true } },
	ubicacion: { select: { id: true, nombre: true, localidad: true } },
} as const;

app.get("/", async (c) => {
	const estado = c.req.query("estado") ?? "";
	const buscar = (c.req.query("buscar") ?? "").trim();
	const ubicacionRaw = c.req.query("id_ubicacion");
	const idUbicacion = ubicacionRaw ? idNumerico(ubicacionRaw) : undefined;
	if ((estado && !esEstado(estado)) || buscar.length > 120) throw new BadRequestError();
	const offset = parametro(c.req.query("offset"), 0, 1000000);
	const limit = Math.max(1, parametro(c.req.query("limit"), 12, 50));
	const where = {
		...(estado ? { estado: estado as EstadoComentario } : {}),
		...(idUbicacion ? { id_ubicacion: idUbicacion } : {}),
		...(buscar
			? {
					OR: [
						{ texto: { contains: buscar } },
						{ usuario: { is: { nombres: { contains: buscar } } } },
						{ usuario: { is: { apellidos: { contains: buscar } } } },
						{ ubicacion: { is: { nombre: { contains: buscar } } } },
					],
				}
			: {}),
	};
	const [comentarios, total, pendientes, publicados, ocultados] = await Promise.all([
		prisma.comentario.findMany({
			where,
			skip: offset,
			take: limit,
			orderBy: { creado_en: "desc" },
			include: relaciones,
		}),
		prisma.comentario.count({ where }),
		prisma.comentario.count({
			where: {
				estado: "PENDIENTE_REVISION",
				...(idUbicacion ? { id_ubicacion: idUbicacion } : {}),
			},
		}),
		prisma.comentario.count({
			where: { estado: "PUBLICADO", ...(idUbicacion ? { id_ubicacion: idUbicacion } : {}) },
		}),
		prisma.comentario.count({
			where: { estado: "OCULTADO", ...(idUbicacion ? { id_ubicacion: idUbicacion } : {}) },
		}),
	]);
	return c.json({
		comentarios,
		total,
		offset,
		limit,
		resumen: { pendientes, publicados, ocultados },
	});
});

app.get("/:id", async (c) => {
	const comentario = await prisma.comentario.findUnique({
		where: { id: idNumerico(c.req.param("id")) },
		include: {
			...relaciones,
			recursos: { select: { uri: true, tipo: true, orden: true }, orderBy: { orden: "asc" } },
		},
	});
	if (!comentario) throw new NotFoundError();
	return c.json(comentario);
});

app.patch("/:id/estado", async (c) => {
	const id = idNumerico(c.req.param("id"));
	const body: unknown = await c.req.json().catch(() => null);
	const estado = body && typeof body === "object" && "estado" in body ? body.estado : undefined;
	if (!esEstado(estado)) throw new BadRequestError();
	const existente = await prisma.comentario.findUnique({ where: { id }, select: { id: true } });
	if (!existente) throw new NotFoundError();
	const comentario = await prisma.comentario.update({
		where: { id },
		data: { estado },
		select: { id: true, estado: true },
	});
	return c.json(comentario);
});

export { app as AdminComentariosRoute };
