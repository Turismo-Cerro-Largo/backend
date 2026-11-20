import { prisma } from "../../configuracion/db.js";
import type { Prisma, Localidad } from "../../configuracion/generated/prisma/client.js";

export function actualizarLocalidad(
	id: number,
	campos: Omit<Prisma.LocalidadUncheckedUpdateInput, "nombre"> & { nombre: string },
	anterior: Localidad,
	nuevoIcono: string | undefined,
	quitar_icono: boolean,
) {
	return prisma.$transaction(async (tx) => {
		const actualizado = await tx.localidad.update({
			where: { id },
			data: { ...campos, icono: nuevoIcono ?? (quitar_icono ? null : anterior.icono) },
		});
		if (anterior.nombre !== campos.nombre) {
			await tx.ubicacion.updateMany({
				where: { localidad: anterior.nombre },
				data: { localidad: campos.nombre },
			});
			await tx.usuario.updateMany({
				where: { localidad: anterior.nombre },
				data: { localidad: campos.nombre },
			});
		}
		return actualizado;
	});
}
