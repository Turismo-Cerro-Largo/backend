import { googleAuth } from "@hono/oauth-providers/google";
import { createMiddleware } from "hono/factory";
import { env } from "../configuracion/env.js";
import { AppError } from "../configuracion/AppError.js";
export const Google = () =>
	createMiddleware(async (c, next) => {
		if (!env.GOOGLE_ID?.trim() || !env.GOOGLE_SECRET?.trim())
			throw new AppError("Acceso con Google no configurado.", 503);
		const frontend = new URL(env.APP_PUBLIC_URL);
		const redirect = new URL(
			env.GOOGLE_REDIRECT_URI?.trim() || "/api/auth/google",
			frontend.origin,
		);
		if (
			redirect.origin !== frontend.origin ||
			redirect.pathname !== "/api/auth/google" ||
			redirect.search ||
			redirect.hash ||
			redirect.username ||
			redirect.password ||
			!["http:", "https:"].includes(redirect.protocol) ||
			(env.NODE_ENV === "production" && redirect.protocol !== "https:")
		)
			throw new AppError("Callback de Google mal configurado.", 503);
		return googleAuth({
			client_id: env.GOOGLE_ID.trim(),
			client_secret: env.GOOGLE_SECRET.trim(),
			redirect_uri: redirect.href,
			scope: ["openid", "email", "profile"],
		})(c, next);
	});
