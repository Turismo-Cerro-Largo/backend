import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "./configuracion/generated/prisma/client.js";
import { runtime, type Bindings } from "./configuracion/runtime.js";
import { app } from "./app.js";
export default {
	async fetch(request: Request, bindings: Bindings, ctx: ExecutionContext) {
		const pending: Promise<unknown>[] = [];
		const prisma = new PrismaClient({ adapter: new PrismaD1(bindings.DB) });
		return runtime.run({ bindings, ctx, prisma, pending }, async () => {
			try {
				return await app.fetch(request, bindings, ctx as never);
			} finally {
				ctx.waitUntil(Promise.allSettled(pending).then(() => prisma.$disconnect()));
			}
		});
	},
} satisfies ExportedHandler<Bindings>;
