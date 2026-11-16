import { palabrasOfensivas } from "./palabras-ofensivas.js";

function normalizar(palabra: string) {
	return palabra.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const bloqueadas = new Set(palabrasOfensivas.map(normalizar));

export function censurarResena(texto: string) {
	return texto.replace(/[\p{L}\p{M}\p{N}_]+/gu, (palabra) =>
		bloqueadas.has(normalizar(palabra))
			? "*".repeat((palabra.match(/\p{L}/gu) ?? []).length)
			: palabra,
	);
}
