import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaMariaDb({
	host: env.DATABASE_HOST,
	user: env.DATABASE_USER,
	password: env.DATABASE_PASSWORD,
	database: env.DATABASE_NAME,
	port: Number(env.DATABASE_PORT),
	connectionLimit: 5,
	allowPublicKeyRetrieval: true,
});
const prisma = new PrismaClient({ adapter });

export { prisma };
