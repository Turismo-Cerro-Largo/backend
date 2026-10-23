import { z } from "zod";

export const correoSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();
export const resetSchema = z
	.object({
		token: z.string().regex(/^[a-f0-9]{64}$/),
		password: z
			.string()
			.min(8)
			.max(32)
			.regex(/^(?=.*[a-z])(?=.*[A-Z]).*$/),
	})
	.strict();
