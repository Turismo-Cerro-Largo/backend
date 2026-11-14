import { eventos_estado_scheme, eventos_formulario_scheme } from "./eventos.scheme.js";
import { formulario, type Datos } from "./eventos.organizador.schema.js";
import { borrar_publicos } from "../../middleware/Archivos.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../configuracion/AppError.js";
import { idValido } from "../shared/parametros.js";
import * as eventosRepository from "./eventos.repository.js";
import type { EstadoEvento } from "../../configuracion/generated/prisma/enums.js";

export function fechaFiltro(valor: string | undefined, fin = false) {
	if (!valor) return undefined;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new BadRequestError("Fecha inválida.");
	const dia = new Date(valor + "T00:00:00Z");
	if (!Number.isFinite(dia.getTime()) || dia.toISOString().slice(0, 10) !== valor)
		throw new BadRequestError("Fecha inválida.");
	// Los filtros corresponden a días completos de Uruguay (UTC-3).
	return new Date(valor + (fin ? "T23:59:59.999-03:00" : "T00:00:00-03:00"));
}
function serializarEvento<
	T extends { recursos: { id: number; tipo: string; descripcion: string | null }[] },
>(e: T) {
	return { ...e, recursos: e.recursos.map((r) => ({ ...r, uri: `/api/recursos/${r.id}` })) };
}

export async function listarEventos(query: {
	limit?: string;
	categoria?: string[];
	offset?: string;
	desde?: string;
	hasta?: string;
	buscar?: string;
	pagina?: string;
}) {
	const limit = Number(query.limit || 50);
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestError();
	const categorias = (query.categoria || []).flatMap((v) => v.split(",")).map(Number);
	const offset = query.offset === undefined ? undefined : Number(query.offset);
	if (
		categorias.some((n) => !Number.isSafeInteger(n) || n < 1) ||
		(offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000))
	)
		throw new BadRequestError();
	const desde = fechaFiltro(query.desde);
	const hasta = fechaFiltro(query.hasta, true);
	const buscar = (query.buscar || "").trim();
	if (buscar.length > 100 || (desde && hasta && desde > hasta))
		throw new BadRequestError("Revisá el rango de fechas.");
	const pagina = Number(query.pagina || 1);
	if (!Number.isInteger(pagina) || pagina < 1 || pagina > 10000) throw new BadRequestError();
	const eventos = await eventosRepository.listarPublicados({
		categorias,
		desde,
		hasta,
		buscar,
		limit,
		skip: offset ?? (pagina - 1) * limit,
	});
	return eventos.map(serializarEvento);
}

export async function detalleEvento(valor: string) {
	const id = idValido(valor);
	if (!id) throw new NotFoundError();
	const evento = await eventosRepository.buscarPublicado(id);
	if (!evento) throw new NotFoundError("Evento no disponible.");
	return serializarEvento(evento);
}

const estados = [
	"BORRADOR",
	"PENDIENTE_REVISION",
	"PUBLICADO",
	"RECHAZADO",
	"CANCELADO",
	"FINALIZADO",
];

const idAdmin = (valor: string) => {
	const n = Number(valor);
	if (!Number.isSafeInteger(n) || n < 1) throw new BadRequestError();
	return n;
};

const pagina = (s: string | undefined, defecto: number, maximo: number) => {
	const n = s === undefined ? defecto : Number(s);
	if (!Number.isSafeInteger(n) || n < 0 || n > maximo) throw new BadRequestError();
	return n;
};

export async function listarAdmin(query: {
	estado?: string;
	buscar?: string;
	offset?: string;
	limit?: string;
}) {
	const estado = query.estado;
	if (estado && !estados.includes(estado)) throw new BadRequestError();

	const buscar = (query.buscar ?? "").trim();
	if (buscar.length > 120) throw new BadRequestError();

	const offset = pagina(query.offset, 0, 1000000);
	const limit = Math.max(1, pagina(query.limit, 12, 50));

	const [total, eventos, pendientes] = await eventosRepository.listarAdministrables(
		estado as EstadoEvento | undefined,
		buscar,
		offset,
		limit,
	);
	return { eventos, total, pendientes, offset, limit };
}

export async function calendarioAdmin(query: { mes?: string; estado?: string; buscar?: string }) {
	const mes = (query.mes ?? "").trim();
	const estado = query.estado;
	const buscar = (query.buscar ?? "").trim();

	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
		throw new BadRequestError();
	}
	if (estado && !estados.includes(estado)) throw new BadRequestError();
	if (buscar.length > 120) throw new BadRequestError();

	const [anio, numeroMes] = mes.split("-").map(Number);

	// Uruguay usa UTC-3. Se interpretan los límites del mes en hora uruguaya.
	// Se asume que los DateTime de Prisma representan instantes UTC.
	const desde = new Date(Date.UTC(anio, numeroMes - 1, 1, 3));
	const hasta = new Date(Date.UTC(anio, numeroMes, 1, 3));

	const eventos = await eventosRepository.listarCalendario(
		estado as EstadoEvento | undefined,
		buscar,
		desde,
		hasta,
	);
	return { mes, total: eventos.length, eventos };
}

export async function detalleAdmin(valor: string) {
	const evento = await eventosRepository.buscarAdministrable(idAdmin(valor));
	if (!evento) throw new NotFoundError();

	return {
		...evento,
		organizador: evento.organizador
			? {
					id: evento.organizador.id,
					nombre_organizacion: evento.organizador.nombre_organizacion,
					rut: evento.organizador.rut_ruc,
				}
			: null,
	};
}

export async function resumenOrganizador(sesion: { id: string; rol: string }) {
	const [total, pendientes, publicados, borradores, ultimos] = await Promise.all([
		eventosRepository.contar({ where: { id_organizador: Number(sesion.id) } }),
		eventosRepository.contar({
			where: { id_organizador: Number(sesion.id), estado: "PENDIENTE_REVISION" },
		}),
		eventosRepository.contar({
			where: { id_organizador: Number(sesion.id), estado: "PUBLICADO" },
		}),
		eventosRepository.contar({
			where: { id_organizador: Number(sesion.id), estado: "BORRADOR" },
		}),
		eventosRepository.listar({
			where: { id_organizador: Number(sesion.id) },
			orderBy: { creado_en: "desc" },
			take: 5,
			select: { id: true, titulo: true, inicio: true, estado: true },
		}),
	]);

	return { total, pendientes, publicados, borradores, ultimos };
}

export async function eventosPorOrganizador(
	id_organizador: string,
	query: Record<string, string | undefined>,
	sesion: { id: string; rol: string },
) {
	if (!Number.isInteger(Number(id_organizador)) || Number(id_organizador) < 1)
		throw new BadRequestError();

	if (sesion.rol !== "ADMINISTRADOR" && Number(id_organizador) !== Number(sesion.id))
		throw new NotFoundError();

	if (
		query.estado &&
		![
			"BORRADOR",
			"PENDIENTE_REVISION",
			"PUBLICADO",
			"RECHAZADO",
			"CANCELADO",
			"FINALIZADO",
		].includes(query.estado as string)
	)
		throw new BadRequestError();

	const eventos = await eventosRepository.listar({
		where: {
			id_organizador: Number(id_organizador),
			...(query.estado ? { estado: query.estado as EstadoEvento } : {}),
		},
		skip: Number(query.offset ?? 0),
		take: Math.min(Number(query.limit ?? 10), 50),
		orderBy: { creado_en: "desc" },
		include: {
			categoria: true,
			recursos: { select: { uri: true, tipo: true, orden: true }, orderBy: { orden: "asc" } },
		},
	});

	return eventos;
}

export async function crearEvento(
	formularioRecibido: Record<string, unknown>,
	sesion: { id: string; rol: string },
	archivos: string[],
) {
	try {
		const datos = eventos_formulario_scheme.safeParse(formularioRecibido);

		if (!datos.success) throw new BadRequestError();

		const evento = await eventosRepository.crear({
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
					[datos.data.telefono, datos.data.correo, datos.data.redes].filter(Boolean).join(" | ") ||
					null,
				estado: datos.data.accion === "revision" ? "PENDIENTE_REVISION" : "BORRADOR",
				id_categoria: datos.data.id_categoria,
				id_organizador: Number(sesion.id),
				recursos: {
					createMany: {
						data: archivos.map((uri, orden) => ({ uri: `/publicos/${uri}`, orden })),
					},
				},
			},
			include: { recursos: { orderBy: { orden: "asc" } } },
		});

		return evento;
	} catch (e) {
		await borrar_publicos(archivos);

		throw e;
	}
}

export async function editarEvento(
	formularioRecibido: Record<string, unknown>,
	id: string,
	sesion: { id: string; rol: string },
	archivos: string[],
) {
	try {
		if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new BadRequestError();

		const datos = eventos_formulario_scheme.safeParse(formularioRecibido);

		if (!datos.success) throw new BadRequestError();

		const existente = await eventosRepository.buscar({
			where: { id: Number(id), id_organizador: Number(sesion.id) },
			select: { estado: true, _count: { select: { recursos: true } } },
		});

		if (!existente) throw new NotFoundError();

		if (!["BORRADOR", "RECHAZADO"].includes(existente.estado)) throw new BadRequestError();

		const evento = await eventosRepository.editar({
			where: { id: Number(id) },
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
					[datos.data.telefono, datos.data.correo, datos.data.redes].filter(Boolean).join(" | ") ||
					null,
				estado: datos.data.accion === "revision" ? "PENDIENTE_REVISION" : "BORRADOR",
				motivo_rechazo: null,
				id_categoria: datos.data.id_categoria,
				recursos: {
					createMany: {
						data: archivos.map((uri, orden) => ({
							uri: `/publicos/${uri}`,
							orden: existente._count.recursos + orden,
						})),
					},
				},
			},
			include: { recursos: { orderBy: { orden: "asc" } } },
		});

		return evento;
	} catch (e) {
		await borrar_publicos(archivos);

		throw e;
	}
}

export async function eliminarEvento(id: string, sesion: { id: string; rol: string }) {
	if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new BadRequestError();

	const { count } = await eventosRepository.eliminarPropio({
		where: { id: Number(id), id_organizador: Number(sesion.id) },
	});

	if (count === 0) throw new NotFoundError();
}

export async function cambiarEstado(json: unknown, id: string) {
	if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new BadRequestError();

	const datos = eventos_estado_scheme.safeParse(json);

	if (!datos.success) throw new BadRequestError();

	if (
		!(await eventosRepository.buscarId({
			where: { id: Number(id) },
			select: { id: true },
		}))
	)
		throw new NotFoundError();

	const evento = await eventosRepository.editar({
		where: { id: Number(id) },
		data: {
			estado: datos.data.estado,
			motivo_rechazo: datos.data.estado === "RECHAZADO" ? datos.data.motivo_rechazo : null,
		},
		select: { id: true, estado: true, motivo_rechazo: true, actualizado_en: true },
	});

	return evento;
}

function validarDatos(datos: Datos) {
	const inicio = new Date(datos.inicio);
	const fin = datos.fin ? new Date(datos.fin) : null;
	if (fin && (Number.isNaN(fin.getTime()) || fin <= inicio)) {
		throw new BadRequestError("La fecha de finalización debe ser posterior al inicio.");
	}
	const parseCoordenada = (valor: string, limite: number): number | null => {
		if (!valor) return null;
		const n = Number(valor);
		if (!Number.isFinite(n) || Math.abs(n) > limite) {
			throw new BadRequestError("Coordenadas inválidas.");
		}
		return n;
	};
	const latitud = parseCoordenada(datos.latitud, 90);
	const longitud = parseCoordenada(datos.longitud, 180);
	if ((latitud === null) !== (longitud === null)) {
		throw new BadRequestError("Ingresá ambas coordenadas.");
	}
	const precio = datos.precio.trim() ? Number(datos.precio) : null;
	if (precio !== null && (!Number.isFinite(precio) || precio < 0 || precio > 99999999.99)) {
		throw new BadRequestError("Precio inválido.");
	}
	if (datos.accion === "revision") {
		if (!datos.localidad || !datos.direccion || latitud === null || longitud === null) {
			throw new BadRequestError("Para enviar a revisión, completá lugar y ubicación en el mapa.");
		}
		if (datos.es_gratuito === "false" && (precio === null || precio <= 0)) {
			throw new BadRequestError("Ingresá un precio mayor a cero para entradas pagas.");
		}
	}
	const lugar = [datos.direccion, datos.localidad].filter(Boolean).join(" | ");
	if (lugar.length > 255) throw new BadRequestError("La dirección es demasiado larga.");
	const contacto = JSON.stringify({
		telefono: datos.telefono,
		correo: datos.correo,
		redes: datos.redes,
	});
	if (contacto.length > 255)
		throw new BadRequestError("Los datos de contacto son demasiado largos.");

	return {
		titulo: datos.titulo,
		descripcion: datos.descripcion,
		inicio,
		fin,
		id_categoria: datos.id_categoria,
		lugar_evento: lugar || null,
		latitud,
		longitud,
		es_gratuito: datos.es_gratuito === "true",
		precio: datos.es_gratuito === "true" ? null : precio,
		contacto,
		estado: datos.accion === "revision" ? ("PENDIENTE_REVISION" as const) : ("BORRADOR" as const),
		motivo_rechazo: null,
	};
}

function transformarBody(body: Record<string, unknown>) {
	const parsed = formulario.safeParse(body);
	if (!parsed.success) {
		throw new BadRequestError(
			"Revisá los datos del evento, la categoría, las fechas y el contacto.",
		);
	}
	return parsed.data;
}

function idOrganizador(sesion: { id: string }) {
	const id = Number(sesion.id);
	if (!Number.isInteger(id) || id <= 0) throw new ForbiddenError();
	return id;
}

async function verificarCategoria(id: number) {
	const categoria = await eventosRepository.buscarCategoria({
		where: { id },
		select: { id: true },
	});
	if (!categoria) throw new BadRequestError("Seleccioná una categoría existente.");
}

const incluir = {
	categoria: { select: { id: true, nombre: true } },
	recursos: {
		where: { tipo: "IMAGEN" as const },
		select: { id: true, uri: true, tipo: true },
		orderBy: { orden: "asc" as const },
	},
};

export async function categoriasOrganizador() {
	const categorias = await eventosRepository.listarCategorias({
		select: { id: true, nombre: true },
		orderBy: { nombre: "asc" },
	});
	return { categorias };
}

export async function listarPropios(sesion: { id: string; rol: string }) {
	const eventos = await eventosRepository.listar({
		where: { id_organizador: idOrganizador(sesion) },
		include: incluir,
		orderBy: { creado_en: "desc" },
	});
	return { eventos };
}

export async function detallePropio(valorId: string, sesion: { id: string; rol: string }) {
	const id = Number(valorId);
	if (!Number.isInteger(id) || id <= 0) throw new BadRequestError("Identificador inválido.");
	const evento = await eventosRepository.buscar({
		where: { id, id_organizador: idOrganizador(sesion) },
		include: incluir,
	});
	if (!evento) throw new NotFoundError("No se encontró el evento.");
	return { evento };
}

export async function crearPropio(
	formularioRecibido: Record<string, unknown>,
	sesion: { id: string; rol: string },
	archivos: string[],
) {
	const recursos = archivos;
	if (recursos.length > 5) {
		await borrar_publicos(recursos);
		throw new BadRequestError("Podés agregar hasta cinco imágenes por operación.");
	}
	const datos = validarDatos(transformarBody(formularioRecibido));
	await verificarCategoria(datos.id_categoria);
	const evento = await eventosRepository.crear({
		data: {
			...datos,
			id_organizador: idOrganizador(sesion),
			recursos: {
				create: recursos.map((nombre, orden) => ({
					uri: `/api/archivos/publicos/${nombre}`,
					tipo: "IMAGEN" as const,
					orden,
				})),
			},
		},
		include: incluir,
	});
	return { evento };
}

export async function editarPropio(
	formularioRecibido: Record<string, unknown>,
	valorId: string,
	sesion: { id: string; rol: string },
	archivos: string[],
) {
	const recursos = archivos;
	if (recursos.length > 5) {
		await borrar_publicos(recursos);
		throw new BadRequestError("Podés agregar hasta cinco imágenes por operación.");
	}
	const id = Number(valorId);
	if (!Number.isInteger(id) || id <= 0) throw new BadRequestError("Identificador inválido.");
	const actual = await eventosRepository.buscar({
		where: { id, id_organizador: idOrganizador(sesion) },
		select: { id: true, estado: true },
	});
	if (!actual) throw new NotFoundError("No se encontró el evento.");
	if (!["BORRADOR", "RECHAZADO"].includes(actual.estado)) {
		throw new ForbiddenError("Solo podés editar borradores o eventos rechazados.");
	}
	const datos = validarDatos(transformarBody(formularioRecibido));
	await verificarCategoria(datos.id_categoria);
	const evento = await eventosRepository.editar({
		where: { id },
		data: {
			...datos,
			recursos: {
				create: recursos.map((nombre, indice) => ({
					uri: `/api/archivos/publicos/${nombre}`,
					tipo: "IMAGEN" as const,
					orden: Date.now() + indice,
				})),
			},
		},
		include: incluir,
	});
	return { evento };
}
