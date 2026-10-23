import { createMiddleware } from "hono/factory";
import { ForbiddenError } from "../configuracion/AppError.js";
export function origenesPermitidos() {
	const configured =
		process.env.APP_ORIGINS ||
		process.env.TURISTA_ORIGINS ||
		(process.env.NODE_ENV === "production"
			? process.env.APP_PUBLIC_URL || ""
			: "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174");
	return configured
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}
export const verificarOrigen = createMiddleware(async (c, next) => {
	if (
		!["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
		!origenesPermitidos().includes(c.req.header("origin") || "")
	)
		throw new ForbiddenError("Origen no autorizado.");
	await next();
});
