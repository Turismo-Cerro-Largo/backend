import { prisma } from "../../configuracion/db.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import type { SolicitudRecuperacion } from "../../configuracion/generated/prisma/client.js";

export function restablecerClave(solicitud: SolicitudRecuperacion, passhash: string) {
	return prisma.$transaction(async (tx) => {
		const cuenta = solicitud.id_usuario
			? { id_usuario: solicitud.id_usuario }
			: { id_organizador: solicitud.id_organizador! };
		// Orden de bloqueos estable para dos recuperaciones concurrentes.
		if (solicitud.id_usuario)
			await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${solicitud.id_usuario} FOR UPDATE`;
		else
			await tx.$queryRaw`SELECT id FROM organizador WHERE id = ${solicitud.id_organizador} FOR UPDATE`;
		const consumido = await tx.solicitudRecuperacion.updateMany({
			where: { id: solicitud.id, usado: false, fecha_expiracion: { gt: new Date() } },
			data: { usado: true },
		});
		if (consumido.count !== 1)
			throw new BadRequestError("El enlace es inválido o venció. Solicitá uno nuevo.");
		if (solicitud.id_usuario)
			await tx.usuario.update({ where: { id: solicitud.id_usuario }, data: { passhash } });
		else
			await tx.organizador.update({ where: { id: solicitud.id_organizador! }, data: { passhash } });
		await tx.solicitudRecuperacion.updateMany({
			where: { ...cuenta, usado: false },
			data: { usado: true },
		});
	});
}
