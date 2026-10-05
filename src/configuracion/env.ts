import "dotenv/config";
import { z } from "zod";

export const env = z
	.object({
		COOKIE_SECRET: z.string().min(32),
		GOOGLE_ID: z.string().min(1),
		GOOGLE_SECRET: z.string().min(1),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	})
	.parse(process.env);