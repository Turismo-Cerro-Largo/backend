import { PrismaPg } from "@prisma/adapter-pg";
import { configurarBaseLocal } from "./db.js";
import { PrismaClient } from "./generated/prisma-node/client.js";

let prisma: PrismaClient | undefined;
configurarBaseLocal(() => {
	return (prisma ??= new PrismaClient({
		adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 }),
	}));
});
