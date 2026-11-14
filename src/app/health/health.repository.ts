import { prisma } from "../../configuracion/db.js";

export async function comprobarBase() {
	await prisma.$transaction([
		prisma.$queryRaw`SELECT 1`,
		prisma.usuario.findFirst(),
		prisma.organizador.findFirst(),
		prisma.documentoOrganizador.findFirst(),
		prisma.categoria.findFirst(),
		prisma.ubicacion.findFirst(),
		prisma.recurso.findFirst(),
		prisma.comentario.findFirst(),
		prisma.favorito.findFirst(),
		prisma.evento.findFirst(),
		prisma.solicitudRecuperacion.findFirst(),
		prisma.empresaTransporte.findFirst(),
		prisma.horarioOmnibus.findFirst(),
	]);
}
