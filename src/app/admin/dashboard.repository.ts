import { prisma } from "../../configuracion/db.js";

// Persistencia: todas las consultas del resumen están reunidas aquí.
export async function consultarResumenAdmin(desdeMes: Date, inicioGrafico: Date) {
	const [
		usuarios, organizadores, organizadoresPendientes, eventos, eventosPublicados,
		eventosPendientes, ubicaciones, empresas, horariosPublicados, usuariosNuevos,
		eventosNuevos, ultimosEventos, ultimosOrganizadores, fechasEventos,
	] = await Promise.all([
		prisma.usuario.count(),
		prisma.organizador.count(),
		prisma.organizador.count({ where: { estado: "PENDIENTE_REVISION" } }),
		prisma.evento.count(),
		prisma.evento.count({ where: { estado: "PUBLICADO" } }),
		prisma.evento.count({ where: { estado: "PENDIENTE_REVISION" } }),
		prisma.ubicacion.count(),
		prisma.empresaTransporte.count(),
		prisma.horarioOmnibus.count({ where: { estado: "PUBLICADO" } }),
		prisma.usuario.count({ where: { creado_en: { gte: desdeMes } } }),
		prisma.evento.count({ where: { creado_en: { gte: desdeMes } } }),
		prisma.evento.findMany({
			orderBy: { creado_en: "desc" },
			take: 6,
			select: { id: true, titulo: true, estado: true, creado_en: true },
		}),
		prisma.organizador.findMany({
			where: { estado: "PENDIENTE_REVISION" },
			orderBy: { creado_en: "desc" },
			take: 5,
			select: { id: true, nombre_organizacion: true, creado_en: true },
		}),
		prisma.evento.findMany({
			where: { creado_en: { gte: inicioGrafico } },
			select: { creado_en: true },
		}),
	]);
	return {
		usuarios, organizadores, organizadoresPendientes, eventos, eventosPublicados,
		eventosPendientes, ubicaciones, empresas, horariosPublicados, usuariosNuevos,
		eventosNuevos, ultimosEventos, ultimosOrganizadores, fechasEventos,
	};
}
