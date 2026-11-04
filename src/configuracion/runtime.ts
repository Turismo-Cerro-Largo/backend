import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "./generated/prisma/client.js";
export interface Bindings {
	DB: D1Database;
	SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
	SUPABASE_STORAGE_BUCKET?: string;
	COOKIE_SECRET: string;
	NODE_ENV?: "development" | "production" | "test";
	APP_PUBLIC_URL?: string;
	APP_ORIGINS?: string;
	GOOGLE_ID?: string;
	GOOGLE_SECRET?: string;
	GOOGLE_REDIRECT_URI?: string;
	MAIL_FROM?: string;
	MAIL_FROM_NAME?: string;
	EMAIL?: {
		send(message: {
			from: { email: string; name?: string };
			to: string;
			subject: string;
			text: string;
		}): Promise<unknown>;
	};
}
export interface Runtime {
	bindings: Bindings;
	ctx: ExecutionContext;
	prisma: PrismaClient;
	pending: Promise<unknown>[];
}
export const runtime = new AsyncLocalStorage<Runtime>();
export function current() {
	const value = runtime.getStore();
	if (!value) throw new Error("Esta operación requiere un contexto Worker.");
	return value;
}
export function background(task: Promise<unknown>) {
	const r = current();
	r.pending.push(task);
	r.ctx.waitUntil(task);
}
