import { prisma } from "../../configuracion/db.js";

import type { Prisma, RecursoTipo } from "../../configuracion/generated/prisma/client.js";

export function reemplazarUbicacion(
	id: number,
	datos: Prisma.UbicacionUncheckedUpdateInput,
	recursos: { uri: string; tipo: RecursoTipo; orden: number }[],
) {
	return prisma.$transaction(async (tx) => {
		await tx.recurso.deleteMany({
			where: {
				id_ubicacion: id,
			},
		});

		await tx.ubicacion.update({
			where: { id },
			data: {
				...datos,
				recursos: {
					create: recursos,
				},
			},
		});
	});
}

export function borrarUbicacion(id: number) {
	return prisma.$transaction(async (tx) => {
		await tx.recurso.deleteMany({
			where: {
				id_ubicacion: id,
			},
		});

		await tx.ubicacion.delete({
			where: { id },
		});
	});
}
