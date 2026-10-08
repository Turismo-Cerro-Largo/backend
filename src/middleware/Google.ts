import { googleAuth } from "@hono/oauth-providers/google";
import { env } from "../configuracion/env.js";

export const Google = () => {
	return googleAuth({
		client_id: env.GOOGLE_ID ?? '',
		client_secret: env.GOOGLE_SECRET ?? '',
		scope: ["openid", "email", "profile"],
	});
};
