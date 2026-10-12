import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../configuracion/db.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import { BadRequestError, NotFoundError, ConflictError } from "../../configuracion/AppError.js";

const app = new Hono();
app.use("*", VerificarSessionRol(["ADMINISTRADOR"]));
const idNumero = (v: string) => {
	const n = Number(v);
	if (!Number.isSafeInteger(n) || n < 1) throw new BadRequestError();
	return n;
};
const datosSchema = z.object({
	nombre: z.string().trim().min(2).max(120),
	descripcion: z.string().trim().min(5).max(5000),
	direccion: z.string().trim().max(250).nullable().optional(),
	localidad: z.string().trim().min(2).max(120),
	telefono: z.string().trim().max(50).nullable().optional(),
	sitio_web: z
		.union([z.literal(""), z.string().url().max(300)])
		.nullable()
		.optional(),
	horario: z.string().trim().max(500).nullable().optional(),
	latitud: z.number().finite().min(-90).max(90),
	longitud: z.number().finite().min(-180).max(180),
	estado: z.enum(["PUBLICADO", "OCULTADO"]),
	id_categoria: z.number().int().positive(),
	recursos: z
		.array(
			z.object({
				tipo: z.enum(["IMAGEN", "VIDEO"]),
				uri: z
					.string()
					.trim()
					.max(500)
					.refine(
						(s) => s.startsWith("/api/archivos/publicos/ubicaciones/"),
						"El recurso debe haber sido subido mediante el sistema de archivos públicos",
					),
			}),
		)
		.max(20)
		.default([]),
});
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
	categoria: { select: { id: true, nombre: true } },
	recursos: {
		select: { id: true, uri: true, tipo: true, orden: true },
		orderBy: { orden: "asc" as const },
	},
} as const;
const normalize = (x: any) => ({ ...x, latitud: Number(x.latitud), longitud: Number(x.longitud) });

const MAX_UPLOAD = 80 * 1024 * 1024;
function archivoPermitido(
	data: Uint8Array,
): { mime: string; extension: string; tipo: "IMAGEN" | "VIDEO"; max: number } | null {
	const hex = (n: number) =>
		Array.from(data.subarray(0, n))
			.map((x) => x.toString(16).padStart(2, "0"))
			.join("");
	const ascii = (a: number, b: number) => new TextDecoder().decode(data.subarray(a, b));
	if (hex(3) === "ffd8ff")
		return { mime: "image/jpeg", extension: "jpg", tipo: "IMAGEN", max: 10 * 1024 * 1024 };
	if (hex(8) === "89504e470d0a1a0a")
		return { mime: "image/png", extension: "png", tipo: "IMAGEN", max: 10 * 1024 * 1024 };
	if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
		return { mime: "image/webp", extension: "webp", tipo: "IMAGEN", max: 10 * 1024 * 1024 };
	if (ascii(0, 6) === "GIF89a" || ascii(0, 6) === "GIF87a")
		return { mime: "image/gif", extension: "gif", tipo: "IMAGEN", max: 10 * 1024 * 1024 };
	if (hex(4) === "1a45dfa3")
		return { mime: "video/webm", extension: "webm", tipo: "VIDEO", max: MAX_UPLOAD };
	if (
		ascii(4, 8) === "ftyp" &&
		["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(ascii(8, 12))
	)
		return { mime: "video/mp4", extension: "mp4", tipo: "VIDEO", max: MAX_UPLOAD };
	return null;
}
// Esta ruta debe registrarse antes de /:id.
app.post("/recursos/upload", async (c) => {
	const contentLength = Number(c.req.header("content-length") ?? "0");
	if (contentLength > MAX_UPLOAD + 1024 * 1024)
		return c.json({ error: "Archivo demasiado grande (máximo 80 MB para videos)." }, 413);
	const body = await c.req.formData().catch(() => null);
	const file = body?.get("archivo");
	if (!(file instanceof File)) return c.json({ error: "Seleccioná una imagen o video." }, 400);
	if (file.size === 0 || file.size > MAX_UPLOAD)
		return c.json({ error: "Tamaño de archivo no permitido." }, 413);
	const bytes = new Uint8Array(await file.arrayBuffer());
	const formato = archivoPermitido(bytes);
	if (!formato || file.size > formato.max)
		return c.json(
			{
				error:
					"Formato o tamaño no permitido. Imágenes hasta 10 MB; videos hasta 80 MB (MP4/WebM).",
			},
			400,
		);
	const nombre = `${randomUUID()}.${formato.extension}`;
	const carpeta = path.join(process.cwd(), "publicos", "ubicaciones");
	await mkdir(carpeta, { recursive: true });
	await writeFile(path.join(carpeta, nombre), bytes, { flag: "wx" });
	return c.json({ uri: `/api/archivos/publicos/ubicaciones/${nombre}`, tipo: formato.tipo }, 201);
});
app.get("/", async (c) => {
	const offset = Number(c.req.query("offset") ?? "0"),
		limit = Number(c.req.query("limit") ?? "12");
	if (
		!Number.isSafeInteger(offset) ||
		offset < 0 ||
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > 50
	)
		throw new BadRequestError();
	const buscar = (c.req.query("buscar") ?? "").trim();
	if (buscar.length > 100) throw new BadRequestError();
	const estado = c.req.query("estado");
	if (estado && !["PUBLICADO", "OCULTADO"].includes(estado)) throw new BadRequestError();
	const categoria = c.req.query("categoria");
	if (categoria && (!Number.isSafeInteger(Number(categoria)) || Number(categoria) < 1))
		throw new BadRequestError();
	const where = {
		...(estado ? { estado: estado as "PUBLICADO" | "OCULTADO" } : {}),
		...(categoria ? { id_categoria: Number(categoria) } : {}),
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
	const [total, ubicaciones, publicadas] = await Promise.all([
		prisma.ubicacion.count({ where }),
		prisma.ubicacion.findMany({
			where,
			skip: offset,
			take: limit,
			orderBy: { creado_en: "desc" },
			select,
		}),
		prisma.ubicacion.count({ where: { estado: "PUBLICADO" } }),
	]);
	return c.json({ total, publicadas, ubicaciones: ubicaciones.map(normalize) });
});
app.get("/:id", async (c) => {
	const u = await prisma.ubicacion.findUnique({
		where: { id: idNumero(c.req.param("id")) },
		select,
	});
	if (!u) throw new NotFoundError();
	return c.json(normalize(u));
});
async function comprobarCategoria(id: number) {
	if (!(await prisma.categoria.findUnique({ where: { id }, select: { id: true } })))
		throw new BadRequestError();
}
function recursoData(recursos: { uri: string; tipo: "IMAGEN" | "VIDEO" }[]) {
	return recursos.map((r, orden) => ({ uri: r.uri, tipo: r.tipo, orden }));
}
app.post("/", async (c) => {
	const result = datosSchema.safeParse(await c.req.json().catch(() => null));
	if (!result.success)
		return c.json({ error: "Datos inválidos", detalles: result.error.flatten() }, 400);
	const { recursos, ...datos } = result.data;
	await comprobarCategoria(datos.id_categoria);
	const nueva = await prisma.ubicacion.create({
		data: { ...datos, recursos: { create: recursoData(recursos) } },
	});
	return c.json({ id: nueva.id }, 201);
});
app.put("/:id", async (c) => {
	const id = idNumero(c.req.param("id"));
	const result = datosSchema.safeParse(await c.req.json().catch(() => null));
	if (!result.success)
		return c.json({ error: "Datos inválidos", detalles: result.error.flatten() }, 400);
	if (!(await prisma.ubicacion.findUnique({ where: { id }, select: { id: true } })))
		throw new NotFoundError();
	const { recursos, ...datos } = result.data;
	await comprobarCategoria(datos.id_categoria);
	// Solo modifica imágenes del lugar, nunca recursos de eventos o comentarios.
	await prisma.$transaction(async (tx) => {
		await tx.recurso.deleteMany({ where: { id_ubicacion: id } });
		await tx.ubicacion.update({
			where: { id },
			data: { ...datos, recursos: { create: recursoData(recursos) } },
		});
	});
	return c.json({ ok: true });
});
app.patch("/:id/estado", async (c) => {
	const id = idNumero(c.req.param("id"));
	const parsed = z
		.object({ estado: z.enum(["PUBLICADO", "OCULTADO"]) })
		.safeParse(await c.req.json().catch(() => null));
	if (!parsed.success) throw new BadRequestError();
	if (!(await prisma.ubicacion.findUnique({ where: { id }, select: { id: true } })))
		throw new NotFoundError();
	const u = await prisma.ubicacion.update({
		where: { id },
		data: parsed.data,
		select: { id: true, estado: true },
	});
	return c.json(u);
});
app.delete("/:id", async (c) => {
	const id = idNumero(c.req.param("id"));
	const u = await prisma.ubicacion.findUnique({
		where: { id },
		select: { _count: { select: { comentarios: true, favoritos: true } } },
	});
	if (!u) throw new NotFoundError();
	if (u._count.comentarios || u._count.favoritos) throw new ConflictError();
	await prisma.$transaction(async (tx) => {
		await tx.recurso.deleteMany({ where: { id_ubicacion: id } });
		await tx.ubicacion.delete({ where: { id } });
	});
	return c.body(null, 204);
});
export { app as AdminUbicacionesRoute };
