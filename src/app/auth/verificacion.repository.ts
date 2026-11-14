import { prisma } from "../../configuracion/db.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import type {
	VerificacionCorreo,
	TipoVerificacion,
} from "../../configuracion/generated/prisma/client.js";

export function consumirCodigo(
	registro: VerificacionCorreo,
	calculada: string,
	email: string,
	tipo: TipoVerificacion,
) {
	return prisma.$transaction(async (tx) => {
		// Eliminar el código para impedir su reutilización.
		const consumido = await tx.verificacionCorreo.deleteMany({
			where: {
				id: registro.id,
				codigo_hash: calculada,
				intentos: { lt: 5 },
				expira_en: { gt: new Date() },
			},
		});

		if (consumido.count !== 1) {
			throw new BadRequestError("El código venció o ya fue utilizado.");
		}

		// Si es turista, verificar la cuenta.
		if (tipo === "TURISTA") {
			const actualizado = await tx.usuario.updateMany({
				where: {
					email,
					email_verificado: false,
				},
				data: {
					email_verificado: true,
				},
			});

			if (actualizado.count !== 1) {
				throw new BadRequestError("Cuenta no disponible.");
			}
		} else {
			// Si es organizador, verificar solamente el correo.
			// Su estado sigue PENDIENTE_REVISION.
			const actualizado = await tx.organizador.updateMany({
				where: {
					email,
					email_verificado: false,
				},
				data: {
					email_verificado: true,
				},
			});

			if (actualizado.count !== 1) {
				throw new BadRequestError("Cuenta no disponible.");
			}
		}
	});
}
