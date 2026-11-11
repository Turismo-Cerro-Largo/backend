import { createMiddleware } from "hono/factory";
import { env } from "../configuracion/env.js";

type Accion = "login" | "register" | "register-organizador";

export const verificarTurnstile = (accion: Accion) =>
	createMiddleware(async (c, next) => {
		const rechazar = () => c.json({
			code: "TURNSTILE_INVALID",
			message: "Completá nuevamente la verificación de seguridad.",
		}, 400);
		const noDisponible = () => c.json({
			code: "TURNSTILE_UNAVAILABLE",
			message: "La verificación de seguridad no está disponible. Volvé a intentar en unos minutos.",
		}, 503);

		const body = await c.req.parseBody({ all: true }).catch(() => null);
		const token = body?.turnstileToken;
		if (typeof token !== "string" || !token.trim() || token.length > 2048) return rechazar();
		if (!env.TURNSTILE_SECRET_KEY) return noDisponible();

		try {
			const respuesta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
				method: "POST",
				body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
				signal: AbortSignal.timeout(5000),
			});
			if (!respuesta.ok) return noDisponible();

			const resultado = await respuesta.json();
			if (typeof resultado?.success !== "boolean") return noDisponible();
			if (resultado["error-codes"]?.some((codigo: string) =>
				["internal-error", "missing-input-secret", "invalid-input-secret"].includes(codigo),
			)) return noDisponible();
			if (!resultado.success || resultado.action !== accion) return rechazar();
			if (env.TURNSTILE_HOSTNAME && resultado.hostname !== env.TURNSTILE_HOSTNAME) return rechazar();
		} catch {
			return noDisponible();
		}

		await next();
	});
