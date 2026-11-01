import type { PrismaClient } from "./generated/prisma/client.js";
import { current } from "./runtime.js";
import { batch, updateSQL } from "./d1.js";
const tables: Record<string, string> = {
	evento: "evento",
	ubicacion: "ubicacion",
	organizador: "organizador",
};
type NestedWrite = {
	create?: Record<string, unknown> | Record<string, unknown>[];
	createMany?: { data: Record<string, unknown>[] };
};
type Args = {
	data: Record<string, unknown> & { recursos?: NestedWrite; documentos?: NestedWrite };
	where?: { id: number };
	include?: unknown;
	select?: unknown;
};
async function nested(model: string, method: string, args: Args) {
	const table = tables[model]!;
	const relation = model === "organizador" ? "documentos" : "recursos";
	const { [relation]: relationData, ...data } = args.data;
	const children = relationData!;
	const childTable = relation === "documentos" ? "documento_organizador" : "recurso";
	const fk =
		model === "organizador" ? "id_organizador" : model === "evento" ? "id_evento" : "id_ubicacion";
	if (model === "evento") data.actualizado_en = new Date();
	const entries = Object.entries(data).filter(([, v]) => v !== undefined);
	if (entries.some(([k]) => !/^[a-z_]+$/.test(k))) throw new Error("Columna inválida");
	const statements =
		method === "create"
			? [
					{
						sql:
							'INSERT INTO "' +
							table +
							'" (' +
							entries.map(([k]) => '"' + k + '"').join(",") +
							") VALUES (" +
							entries.map(() => "?").join(",") +
							") RETURNING id",
						values: entries.map(([, v]) => v),
					},
				]
			: [updateSQL(table, data, args.where!.id)];
	if (Object.keys(children).some((k) => !["create", "createMany"].includes(k)))
		throw new Error("Relación anidada no soportada en D1");
	// D1 serializa el batch completo: MAX(id) sigue siendo el padre recién creado, aunque las inserciones hijas tengan sus propios IDs.
	const rows = children.createMany?.data ?? children.create ?? [];
	for (const row of Array.isArray(rows) ? rows : [rows]) {
		const e = Object.entries(row).filter(([, v]) => v !== undefined);
		if (e.some(([k]) => !/^[a-z_]+$/.test(k))) throw new Error("Columna inválida");
		statements.push({
			sql:
				'INSERT INTO "' +
				childTable +
				'" (' +
				e
					.map(([k]) => '"' + k + '"')
					.concat(fk)
					.join(",") +
				") VALUES (" +
				e
					.map(() => "?")
					.concat(method === "create" ? '(SELECT MAX(id) FROM "' + table + '")' : "?")
					.join(",") +
				")",
			values: [...e.map(([, v]) => v), ...(method === "create" ? [] : [args.where!.id])],
		});
	}
	const results = await batch(statements);
	const id =
		method === "create" ? Number((results[0]!.results[0] as { id: number }).id) : args.where!.id;
	const delegate = Reflect.get(current().prisma, model);
	return delegate.findUniqueOrThrow({
		where: { id },
		...(args.include ? { include: args.include } : {}),
		...(args.select ? { select: args.select } : {}),
	});
}
export const prisma = new Proxy({} as PrismaClient, {
	get(_target, key) {
		const client = current().prisma;
		if (key === "$transaction")
			throw new Error("Usar batch D1 atómico, no transacciones interactivas.");
		const value = Reflect.get(client, key);
		if (typeof key === "string" && tables[key])
			return new Proxy(value, {
				get(target, method) {
					const fn = target[method];
					if (method === "create" || method === "update")
						return (args: Args) => {
							const relation = key === "organizador" ? "documentos" : "recursos";
							return args.data?.[relation]
								? nested(key, String(method), args)
								: fn.call(target, args);
						};
					return typeof fn === "function" ? fn.bind(target) : fn;
				},
			});
		return typeof value === "function" ? value.bind(client) : value;
	},
});
