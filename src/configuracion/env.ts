// src/configuracion/env.ts
import { z } from "zod";

export const env = z
	.object({
		// Database
		DATABASE_URL: z.string().min(1),

		// Security
		COOKIE_SECRET: z.string().min(32),
		TURNSTILE_SECRET_KEY: z.string().trim().optional(),
		TURNSTILE_HOSTNAME: z.string().trim().optional(),

		// Google
		GOOGLE_ID: z.string().optional(),
		GOOGLE_SECRET: z.string().optional(),
		GOOGLE_REDIRECT_FRONTEND: z.string().optional(),

		// Environment
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	})
	.parse(process.env);
