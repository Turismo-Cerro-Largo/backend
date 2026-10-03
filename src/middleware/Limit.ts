import { bodyLimit } from "hono/body-limit";
import { BadRequestError } from "../configuracion/AppError.js";

type Unidad = "KB" | "MB";

export const bodyLimitado = (tamanio: number, unidad: Unidad = "MB") => {
	const multiplicador = unidad === "KB" ? 1024 : 1024 * 1024;

	return bodyLimit({
		maxSize: tamanio * multiplicador,
		onError: () => {
			throw new BadRequestError();
		},
	});
};
