import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { VerificarSessionRol } from "../../middleware/Session.js";

const app = new Hono();

// Solo datos de resumen. Nunca devolver datos personales o documentos privados.
app.get("/", VerificarSessionRol(["ADMINISTRADOR"]), async (c) => {
	// Revalidación del rol actual: la cookie firmada podría conservar un rol antiguo.
	const sesion = c.get("sesion");
	if (sesion.tipo !== "usuario" && sesion.tipo !== "USUARIO") {
		return c.json({ error: "Sin permisos" }, 403);
	}
	const admin = await prisma.usuario.findUnique({
		where: { id: Number(sesion.id) },
		select: { rol: true },
	});
	if (admin?.rol !== "ADMINISTRADOR") return c.json({ error: "Sin permisos" }, 403);

	const hoy = new Date();
	const desdeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
	const inicioGrafico = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
	const [
		usuarios,
		organizadores,
		organizadoresPendientes,
		eventos,
		eventosPublicados,
		eventosPendientes,
		ubicaciones,
		empresas,
		horariosPublicados,
		usuariosNuevos,
		eventosNuevos,
		ultimosEventos,
		ultimosOrganizadores,
		fechasEventos,
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

	const meses = Array.from({ length: 6 }, (_, i) => {
		const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
		return {
			clave: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`,
			mes: new Intl.DateTimeFormat("es-UY", { month: "short" }).format(fecha),
			total: 0,
		};
	});
	const indice = new Map(meses.map((m, i) => [m.clave, i]));
	for (const { creado_en } of fechasEventos) {
		const clave = `${creado_en.getFullYear()}-${String(creado_en.getMonth() + 1).padStart(2, "0")}`;
		const posicion = indice.get(clave);
		if (posicion !== undefined) meses[posicion].total++;
	}
	return c.json({
		totales: {
			usuarios,
			organizadores,
			eventos,
			eventosPublicados,
			ubicaciones,
			empresas,
			horariosPublicados,
		},
		pendientes: { eventos: eventosPendientes, organizadores: organizadoresPendientes },
		esteMes: { usuarios: usuariosNuevos, eventos: eventosNuevos },
		eventosPorMes: meses,
		ultimosEventos,
		ultimosOrganizadores,
	});
});

export { app as DashboardAdminRoute };
