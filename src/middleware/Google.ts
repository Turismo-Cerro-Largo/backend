import { googleAuth } from "@hono/oauth-providers/google";

export const Google = () => {
	return googleAuth({
		// biome-ignore lint/style/noNonNullAssertion: variable validada
		client_id: process.env.GOOGLE_ID!,
		// biome-ignore lint/style/noNonNullAssertion: variable validada
		client_secret: process.env.GOOGLE_SECRET!,
		scope: ["openid", "email", "profile"],
	});
};
