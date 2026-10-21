import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import { idValido } from "./turista.schema.js";

export const camposLugar = {
	id: true,
	nombre: true,
	descripcion: true,
	localidad: true,
	direccion: true,
	horario: true,
	telefono: true,
	sitio_web: true,
	latitud: true,
	longitud: true,
	categoria: { select: { id: true, nombre: true } },
	recursos: { orderBy: { orden: "asc" }, select: { id: true, tipo: true, descripcion: true } },
} as const;

const app = new Hono();

app.get("/", async (c) => {
	const buscar = (c.req.query("buscar") || "").trim();
	const localidad = (c.req.query("localidad") || "").trim();
	const pagina = Number(c.req.query("pagina") || 1);
	if (buscar.length > 100 || localidad.length > 100 || !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000)
		throw new BadRequestError();
	const where = {
		estado: "PUBLICADO" as const,
		...(localidad ? { localidad } : {}),
		...(buscar
			? { OR: [{ nombre: { contains: buscar } }, { localidad: { contains: buscar } }] }
			: {}),
	};
	const [lugares, total] = await Promise.all([
		prisma.ubicacion.findMany({
			where,
			select: camposLugar,
			orderBy: [{ nombre: "asc" }, { id: "asc" }],
			skip: (pagina - 1) * 12,
			take: 12,
		}),
		prisma.ubicacion.count({ where }),
	]);
	return c.json({ lugares, total, pagina, porPagina: 12 });
});

app.get("/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	const lugar = await prisma.ubicacion.findFirst({
		where: { id, estado: "PUBLICADO" },
		select: camposLugar,
	});
	if (!lugar) throw new NotFoundError("Este lugar no está disponible.");
	const [comentarios, valoraciones] = await Promise.all([
		prisma.comentario.findMany({
			where: { id_ubicacion: id, estado: "PUBLICADO" },
			take: 50,
			orderBy: [{ creado_en: "desc" }, { id: "desc" }],
			select: {
				id: true,
				texto: true,
				calificacion: true,
				creado_en: true,
				usuario: { select: { nombres: true } },
			},
		}),
		prisma.comentario.aggregate({
			where: { id_ubicacion: id, estado: "PUBLICADO" },
			_avg: { calificacion: true },
			_count: { id: true },
		}),
	]);
	return c.json({
		lugar,
		comentarios,
		promedio: valoraciones._avg.calificacion,
		totalValoraciones: valoraciones._count.id,
	});
});

export { app as LugaresRoute };
