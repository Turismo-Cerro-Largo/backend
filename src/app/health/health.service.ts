import { comprobarBase } from "./health.repository.js";

export async function comprobarSalud() {
	const inicio = Date.now();
	try {
		await comprobarBase();
		return { database: "ok" as const, latencia_ms: Date.now() - inicio };
	} catch (error) {
		console.error("Health check falló:", error);
		return { database: "error" as const };
	}
}
