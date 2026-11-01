import { current } from "../configuracion/runtime.js";
import { NotFoundError } from "../configuracion/AppError.js";
export function objectKey(key: string) {
	if (
		!/^(publicos|privados|privado\/perfiles|publico\/eventos|publico\/demo)\/(?:seed\/)?[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(
			key,
		)
	)
		throw new NotFoundError();
	return key;
}
export const bucket = () => current().bindings.FILES;
export async function putObject(key: string, file: File) {
	await bucket().put(objectKey(key), await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});
}
export async function deleteObject(key: string) {
	await bucket().delete(objectKey(key));
}
export async function readObject(key: string) {
	const object = await bucket().get(objectKey(key));
	if (!object) throw new NotFoundError();
	return new Uint8Array(await object.arrayBuffer());
}
export async function objectResponse(key: string, request: Request) {
	key = objectKey(key);
	const head = await bucket().head(key);
	if (!head) throw new NotFoundError();
	const headers = new Headers({
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff",
		"Accept-Ranges": "bytes",
	});
	headers.set("Content-Type", head.httpMetadata?.contentType ?? "application/octet-stream");
	headers.set("ETag", head.httpEtag);
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
	const object = await bucket().get(
		key,
		range ? { range: { offset, length: end - offset + 1 } } : undefined,
	);
	if (!object) throw new NotFoundError();
	return new Response(object.body, { status: range ? 206 : 200, headers });
}
