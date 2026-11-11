// src/configuracion/env.ts
import "dotenv/config";
import { z } from "zod";

export const env = z
	.object({
		// Database
		DATABASE_URL: z.string().min(1),
		DATABASE_USER: z.string().min(1),
		DATABASE_PASSWORD: z.string(),
		DATABASE_NAME: z.string().min(1),
		DATABASE_HOST: z.string().min(1),
		DATABASE_PORT: z.coerce.number().int().positive().default(3306),

		// Security
		COOKIE_SECRET: z.string().min(32),
		TURNSTILE_SECRET_KEY: z.string().trim().optional(),
		TURNSTILE_HOSTNAME: z.string().trim().optional(),

		// Google
		GOOGLE_ID: z.string().optional(),
		GOOGLE_SECRET: z.string().optional(),
		GOOGLE_REDIRECT_FRONTEND: z.string().optional(),

		// Environment
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	})
	.parse(process.env);
