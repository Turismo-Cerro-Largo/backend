import { z } from "zod";
import { current } from "./runtime.js";
const schema = z.object({
	COOKIE_SECRET: z.string().min(32),
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
	GOOGLE_ID: z.string().optional(),
	GOOGLE_SECRET: z.string().optional(),
	GOOGLE_REDIRECT_URI: z.string().optional(),
	APP_PUBLIC_URL: z.string().url(),
	APP_ORIGINS: z.string().min(1),
	TURNSTILE_SECRET_KEY: z.string().trim().optional(),
	TURNSTILE_HOSTNAME: z.string().trim().optional(),
	MAIL_FROM: z.string().email().optional(),
	MAIL_FROM_NAME: z.string().optional(),
});
export type Configuration = z.infer<typeof schema>;
export const env = new Proxy({} as Configuration, {
	get(_target, key) {
		return Reflect.get(schema.parse(current().bindings), key);
	},
});
