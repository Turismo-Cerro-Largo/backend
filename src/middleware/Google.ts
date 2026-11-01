import { googleAuth } from "@hono/oauth-providers/google";
import { createMiddleware } from "hono/factory";
import { env } from "../configuracion/env.js";
export const Google = () =>
	createMiddleware(async (c, next) =>
		googleAuth({
			client_id: env.GOOGLE_ID ?? "",
			client_secret: env.GOOGLE_SECRET ?? "",
			scope: ["openid", "email", "profile"],
		})(c, next),
	);
