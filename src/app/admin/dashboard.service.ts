import { consultarResumenAdmin } from "./dashboard.repository.js";

// Aplicación: calcula indicadores y mantiene el contrato JSON del panel.
export async function obtenerResumenAdmin(hoy = new Date()) {
	const desdeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
	const inicioGrafico = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
	const datos = await consultarResumenAdmin(desdeMes, inicioGrafico);
	const meses = Array.from({ length: 6 }, (_, i) => {
		const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
		return {
			clave: fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0"),
			mes: new Intl.DateTimeFormat("es-UY", { month: "short" }).format(fecha),
			total: 0,
		};
	});
	const indice = new Map(meses.map((mes, i) => [mes.clave, i]));
	for (const { creado_en } of datos.fechasEventos) {
		const clave = creado_en.getFullYear() + "-" + String(creado_en.getMonth() + 1).padStart(2, "0");
		const posicion = indice.get(clave);
		if (posicion !== undefined) meses[posicion].total++;
	}
	return {
		totales: {
			usuarios: datos.usuarios,
			organizadores: datos.organizadores,
			eventos: datos.eventos,
			eventosPublicados: datos.eventosPublicados,
			ubicaciones: datos.ubicaciones,
			empresas: datos.empresas,
			horariosPublicados: datos.horariosPublicados,
		},
		pendientes: { eventos: datos.eventosPendientes, organizadores: datos.organizadoresPendientes },
		esteMes: { usuarios: datos.usuariosNuevos, eventos: datos.eventosNuevos },
		eventosPorMes: meses,
		ultimosEventos: datos.ultimosEventos,
		ultimosOrganizadores: datos.ultimosOrganizadores,
	};
}
