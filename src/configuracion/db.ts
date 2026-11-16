import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const solicitudes = new AsyncLocalStorage<PrismaClient>();
let local: (() => object) | undefined;

export function configurarBaseLocal(cliente: () => object) {
	local = cliente;
}

function crearCliente(connectionString: string, max: number) {
	return new PrismaClient({
		adapter: new PrismaPg({ connectionString, max, connectionTimeoutMillis: 5000 }),
	});
}

export async function conBaseDeDatos<T>(url: string, fn: () => Promise<T>) {
	const cliente = crearCliente(url, 1);
	try {
		return await solicitudes.run(cliente, fn);
	} finally {
		await cliente.$disconnect();
	}
}

export const prisma = new Proxy({} as PrismaClient, {
	get(_target, propiedad) {
		const cliente = solicitudes.getStore() ?? local?.();
		if (!cliente) throw new Error("No se inicializó la base de datos.");
		const valor = Reflect.get(cliente, propiedad);
		return typeof valor === "function" ? valor.bind(cliente) : valor;
	},
});
