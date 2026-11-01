import { current } from "./runtime.js";
export type SQLValue = string | number | null;
export function sqlValue(value: unknown): SQLValue {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "boolean") return value ? 1 : 0;
	if (value === undefined || value === null) return null;
	if (typeof value === "string" || typeof value === "number") return value;
	throw new Error("Valor SQL no escalar");
}
export type Statement = { sql: string; values?: unknown[] };
export function batch(statements: Statement[]) {
	return current().bindings.DB.batch(
		statements.map((s) =>
			current()
				.bindings.DB.prepare(s.sql)
				.bind(...(s.values ?? []).map(sqlValue)),
		),
	);
}
export function updateSQL(table: string, data: Record<string, unknown>, id: number): Statement {
	if (!["ubicacion", "localidad", "evento", "organizador"].includes(table))
		throw new Error("Tabla no permitida");
	const entries = Object.entries(data).filter(([, v]) => v !== undefined);
	if (entries.some(([k]) => !/^[a-z_]+$/.test(k))) throw new Error("Columna inválida");
	return {
		sql:
			'UPDATE "' +
			table +
			'" SET ' +
			entries.map(([k]) => '"' + k + '" = ?').join(",") +
			" WHERE id = ?",
		values: [...entries.map(([, v]) => v), id],
	};
}
