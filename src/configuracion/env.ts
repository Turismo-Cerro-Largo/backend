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

		// Google
		GOOGLE_ID: z.string().min(1),
		GOOGLE_SECRET: z.string().min(1),
		GOOGLE_REDIRECT_FRONTEND: z.string(),

		// Environment
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	})
	.parse(process.env);