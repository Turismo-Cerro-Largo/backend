import * as empresaTransporteRepository from "./empresas.repository.js";
import * as horarioOmnibusRepository from "./horarios.repository.js";
import type { z } from "zod";
import { empresaSchema, horarioSchema, estadoHorarioSchema } from "./transporte.schema.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";

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

const checkBody = (body: unknown, schema: z.ZodTypeAny) => {
	const parsed = schema.safeParse(body);
	if (!parsed.success)
		throw new BadRequestError(parsed.error.issues.map((x) => x.message).join(". "));
	return parsed.data;
};

export async function listarEmpresas() {
	const empresas = await empresaTransporteRepository.findMany({
		orderBy: { nombre: "asc" },
		include: { _count: { select: { horarios: true } } },
	});
	return { empresas };
}

export async function detalleEmpresa(valorId: string) {
	const empresa = await empresaTransporteRepository.findUnique({
		where: { id: parseId(valorId) },
		include: { _count: { select: { horarios: true } } },
	});
	if (!empresa) throw new NotFoundError();
	return empresa;
}

export async function crearEmpresa(json: unknown) {
	const d = (await checkBody(json, empresaSchema)) as z.infer<typeof empresaSchema>;
	const duplicated = await empresaTransporteRepository.findFirst({ where: { nombre: d.nombre } });
	if (duplicated) throw new ConflictError();
	const empresa = await empresaTransporteRepository.create({
		data: {
			nombre: d.nombre,
			telefono: d.telefono || null,
			sitio_web: d.sitio_web || null,
		},
	});
	return empresa;
}

export async function editarEmpresa(valorId: string, json: unknown) {
	const id = parseId(valorId);
	const d = (await checkBody(json, empresaSchema)) as z.infer<typeof empresaSchema>;
	if (!(await empresaTransporteRepository.findUnique({ where: { id } }))) throw new NotFoundError();
	if (await empresaTransporteRepository.findFirst({ where: { nombre: d.nombre, NOT: { id } } }))
		throw new ConflictError();
	return await empresaTransporteRepository.update({
		where: { id },
		data: {
			nombre: d.nombre,
			telefono: d.telefono || null,
			sitio_web: d.sitio_web || null,
		},
	});
}

export async function eliminarEmpresa(valorId: string) {
	const id = parseId(valorId);
	if (!(await empresaTransporteRepository.findUnique({ where: { id } }))) throw new NotFoundError();
	if (await horarioOmnibusRepository.count({ where: { id_empresa: id } }))
		throw new ConflictError(
			"La empresa tiene horarios asociados. Eliminá o reasigná los horarios primero.",
		);
	await empresaTransporteRepository.eliminar({ where: { id } });
	return { ok: true };
}

export async function listarHorariosAdmin() {
	const horarios = await horarioOmnibusRepository.findMany({
		orderBy: { id: "desc" },
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	return { horarios: horarios.map(out) };
}

export async function detalleHorario(valorId: string) {
	const horario = await horarioOmnibusRepository.findUnique({
		where: { id: parseId(valorId) },
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	if (!horario || horario.estado !== "PUBLICADO") throw new NotFoundError();
	return out(horario);
}

export async function crearHorario(json: unknown) {
	const d = (await checkBody(json, horarioSchema)) as z.infer<typeof horarioSchema>;
	if (!(await empresaTransporteRepository.findUnique({ where: { id: d.id_empresa } })))
		throw new BadRequestError("La empresa no existe.");
	const horario = await horarioOmnibusRepository.create({
		data: {
			...d,
			hora_salida: asTime(d.hora_salida)!,
			hora_llegada: asTime(d.hora_llegada),
		},
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	return out(horario);
}

export async function editarHorario(valorId: string, json: unknown) {
	const id = parseId(valorId);
	const d = (await checkBody(json, horarioSchema)) as z.infer<typeof horarioSchema>;
	if (!(await horarioOmnibusRepository.findUnique({ where: { id } }))) throw new NotFoundError();
	if (!(await empresaTransporteRepository.findUnique({ where: { id: d.id_empresa } })))
		throw new BadRequestError("La empresa no existe.");
	const horario = await horarioOmnibusRepository.update({
		where: { id },
		data: {
			...d,
			hora_salida: asTime(d.hora_salida)!,
			hora_llegada: asTime(d.hora_llegada),
		},
		include: { empresa: { select: { id: true, nombre: true } } },
	});
	return out(horario);
}

export async function cambiarEstadoHorario(valorId: string, json: unknown) {
	const id = parseId(valorId);
	const d = (await checkBody(json, estadoHorarioSchema)) as { estado: "PUBLICADO" | "OCULTADO" };
	if (!(await horarioOmnibusRepository.findUnique({ where: { id } }))) throw new NotFoundError();
	return out(await horarioOmnibusRepository.update({ where: { id }, data: d }));
}

export async function eliminarHorario(valorId: string) {
	const id = parseId(valorId);
	if (!(await horarioOmnibusRepository.findUnique({ where: { id } }))) throw new NotFoundError();
	await horarioOmnibusRepository.eliminar({ where: { id } });
	return { ok: true };
}

export async function consultarHorarios(query: Record<string, string | undefined>) {
	const origen = (query.origen || "").trim();
	const destino = (query.destino || "").trim();
	const pagina = Number(query.pagina || 1);
	if (
		origen.length > 120 ||
		destino.length > 120 ||
		!Number.isSafeInteger(pagina) ||
		pagina < 1 ||
		pagina > 10000
	)
		throw new BadRequestError();
	const where = {
		estado: "PUBLICADO" as const,
		...(origen ? { origen } : {}),
		...(destino ? { destino } : {}),
	};
	const [horarios, total, rutas] = await Promise.all([
		horarioOmnibusRepository.findMany({
			where,
			skip: (pagina - 1) * 12,
			take: 12,
			orderBy: [{ hora_salida: "asc" }, { id: "asc" }],
			select: {
				id: true,
				origen: true,
				destino: true,
				hora_salida: true,
				hora_llegada: true,
				dias: true,
				tipo_servicio: true,
				precio: true,
				empresa: { select: { nombre: true, telefono: true, sitio_web: true } },
			},
		}),
		horarioOmnibusRepository.count({ where }),
		horarioOmnibusRepository.findMany({
			where: { estado: "PUBLICADO" },
			distinct: ["origen", "destino"],
			select: { origen: true, destino: true },
		}),
	]);
	return {
		horarios: horarios.map((h) => ({
			...h,
			hora_salida: h.hora_salida.toISOString().slice(11, 16),
			hora_llegada: h.hora_llegada?.toISOString().slice(11, 16) || null,
		})),
		total,
		pagina,
		porPagina: 12,
		origenes: [...new Set(rutas.map((r) => r.origen))].sort(),
		destinos: [...new Set(rutas.map((r) => r.destino))].sort(),
	};
}
