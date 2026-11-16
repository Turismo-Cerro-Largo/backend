import { readFile } from "node:fs/promises";
import path from "node:path";
import { getMimeType } from "hono/utils/mime";

export function storageRemoto() {
	return process.env.NODE_ENV === "production" || Boolean(process.env.SUPABASE_URL);
}

async function objeto(clave: string, init: RequestInit = {}) {
	const { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
	const apiKey = SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY;
	if (!SUPABASE_URL || !apiKey || !SUPABASE_STORAGE_BUCKET)
		throw new Error("Falta configurar Supabase Storage.");
	const segmentos = clave ? clave.split("/") : [];
	if (segmentos.some((segmento) => !segmento || segmento === "." || segmento === ".."))
		throw new Error("Ruta de Storage inválida.");
	const host = new URL(SUPABASE_URL);
	if (host.protocol !== "https:" || host.username || host.password) throw new Error("SUPABASE_URL inválida.");
	const metodo = init.method ?? "GET";
	const ruta = metodo === "GET" || metodo === "HEAD" ? "/storage/v1/object/authenticated/" : "/storage/v1/object/";
	const url = new URL(
		ruta + [SUPABASE_STORAGE_BUCKET, ...segmentos].map(encodeURIComponent).join("/"),
		host.origin,
	);
	const headers = new Headers(init.headers);
	headers.set("apikey", apiKey);
	if (!apiKey.startsWith("sb_secret_")) headers.set("Authorization", `Bearer ${apiKey}`);
	return fetch(url, { ...init, headers, redirect: "error", signal: AbortSignal.timeout(30000) });
}

export async function guardarObjeto(clave: string, file: File) {
	const respuesta = await objeto(clave, {
		method: "POST",
		body: file,
		headers: { "Content-Type": file.type, "x-upsert": "false" },
	});
	if (!respuesta.ok) throw new Error("No se pudo guardar el archivo.");
	await respuesta.body?.cancel();
}

export async function borrarObjeto(clave: string) {
	const respuesta = await objeto("", {
		method: "DELETE",
		body: JSON.stringify({ prefixes: [clave] }),
		headers: { "Content-Type": "application/json" },
	});
	await respuesta.body?.cancel();
	if (!respuesta.ok && respuesta.status !== 404) throw new Error("No se pudo borrar el archivo.");
}

export async function leerBytes(clave: string, rutaLocal = path.resolve(clave)) {
	if (!storageRemoto()) return readFile(rutaLocal).catch(() => null);
	const respuesta = await objeto(clave);
	if (!respuesta.ok) {
		await respuesta.body?.cancel();
		return null;
	}
	return Buffer.from(await respuesta.arrayBuffer());
}

export async function responderObjeto(clave: string, range: string | undefined, head: boolean) {
	const respuesta = await objeto(clave, { method: head ? "HEAD" : "GET", headers: range ? { Range: range } : {} });
	if (!respuesta.ok && respuesta.status !== 416) {
		await respuesta.body?.cancel();
		return null;
	}
	const headers = new Headers({
		"Content-Type": getMimeType(clave) ?? "application/octet-stream",
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
	});
	for (const campo of ["content-length", "content-range", "accept-ranges"]) {
		const valor = respuesta.headers.get(campo);
		if (valor) headers.set(campo, valor);
	}
	return new Response(head ? null : respuesta.body, { status: respuesta.status, headers });
}
