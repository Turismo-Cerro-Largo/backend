import { bodyLimit } from "hono/body-limit";
import { PayloadTooLargeError } from "../configuracion/AppError.js";

type Unidad = "KB" | "MB";

export const bodyLimitado = (tamanio: number, unidad: Unidad = "MB") => {
	if (!Number.isFinite(tamanio) || tamanio <= 0) throw new RangeError("Límite de cuerpo inválido.");
	const multiplicador = unidad === "KB" ? 1024 : 1024 * 1024;

	return bodyLimit({
		maxSize: tamanio * multiplicador,
		onError: () => {
			throw new PayloadTooLargeError();
		},
	});
};
