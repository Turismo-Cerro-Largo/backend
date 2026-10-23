import { consultarHorarios } from "../catalogo/transporte.js";
import { Hono } from "hono";
import type { z } from "zod";
import { empresaSchema, horarioSchema, estadoHorarioSchema } from "./transporte.schema.js";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";

const app = new Hono();
const admin = RequerirAdministrador;
const parseId = (id: string) => {
	const n = Number(id);
	if (!Number.isSafeInteger(n) || n < 1) throw new BadRequestError("ID inválido.");
	return n;
};
const asTime = (s: string | null) => (s === null ? null : new Date(`1970-01-01T${s}:00.000Z`));
const formatTime = (v: Date | null) =>
	v
		? `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`
		: null;
const out = (h: any) => ({
	...h,
	hora_salida: formatTime(h.hora_salida),
	hora_llegada: formatTime(h.hora_llegada),
	precio: h.precio === null ? null : Number(h.precio),
});
const checkBody = async (c: any, schema: z.ZodTypeAny) => {
	const parsed = schema.safeParse(await c.req.json().catch(() => null));
	if (!parsed.success)
		throw new BadRequestError(parsed.error.issues.map((x) => x.message).join(". "));
	return parsed.data;
};

// Empresas visibles para el público; edición solo de administrador.
app.get("/empresas", async (c) => {
	const empresas = await prisma.empresaTransporte.findMany({
		orderBy: { nombre: "asc" },
		include: { _count: { select: { horarios: true } } },
	});
	return c.json({ empresas });
});
app.get("/empresas/:id", async (c) => {
	const empresa = await prisma.empresaTransporte.findUnique({
		where: { id: parseId(c.req.param("id")) },
		include: { _count: { select: { horarios: true } } },
	});
	if (!empresa) throw new NotFoundError();
	return c.json(empresa);
});
app.post("/empresas", admin, bodyLimitado(12, "KB"), async (c) => {
	const d = (await checkBody(c, empresaSchema)) as z.infer<typeof empresaSchema>;
	const duplicated = await prisma.empresaTransporte.findFirst({ where: { nombre: d.nombre } });
	if (duplicated) throw new ConflictError();
	const empresa = await prisma.empresaTransporte.create({
		data: {
			nombre: d.nombre,
			telefono: d.telefono || null,
			sitio_web: d.sitio_web || null,
		},
	});
	return c.json(empresa, 201);
});
app.put("/empresas/:id", admin, bodyLimitado(12, "KB"), async (c) => {
	const id = parseId(c.req.param("id"));
	const d = (await checkBody(c, empresaSchema)) as z.infer<typeof empresaSchema>;
	if (!(await prisma.empresaTransporte.findUnique({ where: { id } }))) throw new NotFoundError();
	if (await prisma.empresaTransporte.findFirst({ where: { nombre: d.nombre, NOT: { id } } }))
		throw new ConflictError();
	return c.json(
		await prisma.empresaTransporte.update({
			where: { id },
			data: {
				nombre: d.nombre,
				telefono: d.telefono || null,
				sitio_web: d.sitio_web || null,
			},
		}),
	);
});
app.delete("/empresas/:id", admin, async (c) => {
	const id = parseId(c.req.param("id"));
	if (!(await prisma.empresaTransporte.findUnique({ where: { id } }))) throw new NotFoundError();
	if (await prisma.horarioOmnibus.count({ where: { id_empresa: id } }))
		throw new ConflictError(
			"La empresa tiene horarios asociados. Eliminá o reasigná los horarios primero.",
		);
	await prisma.empresaTransporte.delete({ where: { id } });
	return c.json({ ok: true });
});

// Lista pública muestra SOLO horarios publicados. Admin puede ver todos con ?admin=1.
app.get("/horarios", consultarHorarios);
app.get("/horarios/admin", admin, async (c) => {
	const horarios = await prisma.horarioOmnibus.findMany({
		orderBy: { id: "desc" },
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	return c.json({ horarios: horarios.map(out) });
});
app.get("/horarios/:id", async (c) => {
	const horario = await prisma.horarioOmnibus.findUnique({
		where: { id: parseId(c.req.param("id")) },
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	if (!horario || horario.estado !== "PUBLICADO") throw new NotFoundError();
	return c.json(out(horario));
});
app.post("/horarios", admin, bodyLimitado(12, "KB"), async (c) => {
	const d = (await checkBody(c, horarioSchema)) as z.infer<typeof horarioSchema>;
	if (!(await prisma.empresaTransporte.findUnique({ where: { id: d.id_empresa } })))
		throw new BadRequestError("La empresa no existe.");
	const horario = await prisma.horarioOmnibus.create({
		data: {
			...d,
			hora_salida: asTime(d.hora_salida)!,
			hora_llegada: asTime(d.hora_llegada),
		},
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	return c.json(out(horario), 201);
});
app.put("/horarios/:id", admin, bodyLimitado(12, "KB"), async (c) => {
	const id = parseId(c.req.param("id"));
	const d = (await checkBody(c, horarioSchema)) as z.infer<typeof horarioSchema>;
	if (!(await prisma.horarioOmnibus.findUnique({ where: { id } }))) throw new NotFoundError();
	if (!(await prisma.empresaTransporte.findUnique({ where: { id: d.id_empresa } })))
		throw new BadRequestError("La empresa no existe.");
	const horario = await prisma.horarioOmnibus.update({
		where: { id },
		data: {
			...d,
			hora_salida: asTime(d.hora_salida)!,
			hora_llegada: asTime(d.hora_llegada),
		},
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	return c.json(out(horario));
});
app.patch("/horarios/:id/estado", admin, bodyLimitado(2, "KB"), async (c) => {
	const id = parseId(c.req.param("id"));
	const d = (await checkBody(
		c,
		estadoHorarioSchema,
	)) as { estado: "PUBLICADO" | "OCULTADO" };
	if (!(await prisma.horarioOmnibus.findUnique({ where: { id } }))) throw new NotFoundError();
	return c.json(out(await prisma.horarioOmnibus.update({ where: { id }, data: d })));
});
app.delete("/horarios/:id", admin, async (c) => {
	const id = parseId(c.req.param("id"));
	if (!(await prisma.horarioOmnibus.findUnique({ where: { id } }))) throw new NotFoundError();
	await prisma.horarioOmnibus.delete({ where: { id } });
	return c.json({ ok: true });
});
export { app as TransporteRoute };
