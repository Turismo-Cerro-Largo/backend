import { current } from "../configuracion/runtime.js";
import { AppError, NotFoundError } from "../configuracion/AppError.js";
export function objectKey(key: string) {
	if (
		!/^(publicos|privados|privado\/perfiles|publico\/eventos|publico\/demo)\/(?:seed\/)?[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(
			key,
		)
	)
		throw new NotFoundError();
	return key;
}
function connection() {
	const b = current().bindings;
	if (!b.SUPABASE_URL || !b.SUPABASE_SERVICE_ROLE_KEY || !b.SUPABASE_STORAGE_BUCKET)
		throw new AppError("Almacenamiento no configurado.", 503);
	const url = new URL(b.SUPABASE_URL);
	if (
		url.protocol !== "https:" ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	)
		throw new AppError("Configuración de almacenamiento inválida.", 503);
	return {
		base: url.origin + "/storage/v1",
		bucket: encodeURIComponent(b.SUPABASE_STORAGE_BUCKET),
		headers: {
			apikey: b.SUPABASE_SERVICE_ROLE_KEY,
			Authorization: "Bearer " + b.SUPABASE_SERVICE_ROLE_KEY,
		},
	};
}
async function storageRequest(key: string, init: RequestInit = {}) {
	key = objectKey(key);
	const c = connection(),
		headers = new Headers(c.headers);
	new Headers(init.headers).forEach((v, k) => headers.set(k, v));
	let response: Response;
	try {
		response = await fetch(
			c.base + "/object/" + (init.method === "POST" ? "" : "authenticated/") + c.bucket + "/" + key,
			{ ...init, headers, redirect: "manual", signal: AbortSignal.timeout(30000) },
		);
	} catch {
		throw new AppError("Almacenamiento temporalmente no disponible.", 503);
	}
	if (!response.ok) {
		let missing = response.status === 404;
		if (response.status === 400) {
			const detail = (await response
				.clone()
				.json()
				.catch(() => null)) as { statusCode?: string } | null;
			missing = detail?.statusCode === "404";
		}
		if (missing) throw new NotFoundError();
		throw new AppError("No se pudo acceder al almacenamiento.", 503);
	}
	return response;
}
export async function putObject(key: string, file: File) {
	const response = await storageRequest(key, {
		method: "POST",
		body: await file.arrayBuffer(),
		headers: { "Content-Type": file.type, "x-upsert": "false", "Cache-Control": "max-age=0" },
	});
	await response.body?.cancel();
}
export async function deleteObject(key: string) {
	key = objectKey(key);
	const c = connection();
	let response: Response;
	try {
		response = await fetch(c.base + "/object/" + c.bucket, {
			method: "DELETE",
			redirect: "manual",
			signal: AbortSignal.timeout(30000),
			headers: { ...c.headers, "Content-Type": "application/json" },
			body: JSON.stringify({ prefixes: [key] }),
		});
	} catch {
		throw new AppError("Almacenamiento temporalmente no disponible.", 503);
	}
	if (!response.ok) throw new AppError("No se pudo eliminar el archivo.", 503);
	await response.body?.cancel();
}
export async function readObject(key: string) {
	return new Uint8Array(await (await storageRequest(key)).arrayBuffer());
}
export async function objectResponse(key: string, request: Request) {
	key = objectKey(key);
	const metadata = await storageRequest(key, { method: "HEAD" });
	const head = {
		size: Number(metadata.headers.get("content-length")),
		httpMetadata: { contentType: metadata.headers.get("content-type") },
		httpEtag: metadata.headers.get("etag"),
	};
	if (!metadata.headers.has("content-length") || !Number.isSafeInteger(head.size) || head.size < 0)
		throw new AppError("Metadatos de archivo inválidos.", 503);
	const headers = new Headers({
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff",
		"Accept-Ranges": "bytes",
	});
	headers.set("Content-Type", head.httpMetadata?.contentType ?? "application/octet-stream");
	if (head.httpEtag) headers.set("ETag", head.httpEtag);
	let offset = 0,
		end = head.size - 1;
	const range = request.headers.get("range");
	if (range) {
		const m = /^bytes=(\d*)-(\d*)$/.exec(range);
		if (!m || (!m[1] && !m[2]))
			return new Response(null, {
				status: 416,
				headers: { "Content-Range": "bytes */" + head.size },
			});
		offset = m[1] ? Number(m[1]) : Math.max(0, head.size - Number(m[2]));
		end = m[1] && m[2] ? Math.min(Number(m[2]), end) : end;
		if (
			!Number.isSafeInteger(offset) ||
			!Number.isSafeInteger(end) ||
			offset > end ||
			offset >= head.size ||
			(!m[1] && Number(m[2]) === 0)
		)
			return new Response(null, {
				status: 416,
				headers: { "Content-Range": "bytes */" + head.size },
			});
		headers.set("Content-Range", "bytes " + offset + "-" + end + "/" + head.size);
	}
	headers.set("Content-Length", String(end - offset + 1));
	if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });
	const object = await storageRequest(
		key,
		range ? { headers: { Range: "bytes=" + offset + "-" + end } } : {},
	);
	if (range && object.status !== 206) {
		await object.body?.cancel();
		throw new AppError("El almacenamiento no respondió al rango solicitado.", 503);
	}
	return new Response(object.body, { status: range ? 206 : 200, headers });
}
