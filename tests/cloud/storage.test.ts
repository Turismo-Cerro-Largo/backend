import { afterEach, it, expect, vi } from "vitest";
import { runtime, type Runtime } from "../../src/configuracion/runtime.js";
import { putObject, deleteObject, readObject, objectResponse } from "../../src/services/storage.js";
const bindings = {
	SUPABASE_URL: "https://test.supabase.co",
	SUPABASE_SERVICE_ROLE_KEY: "private-test-key",
	SUPABASE_STORAGE_BUCKET: "cerro-largo-files",
};
const run = <T>(fn: () => T, b = bindings) =>
	runtime.run({ bindings: b } as unknown as Runtime, fn);
afterEach(() => vi.unstubAllGlobals());
it("rechaza configuración ausente y traversal sin llamar al proveedor", async () => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	await expect(
		run(() => readObject("publicos/test.png"), {} as typeof bindings),
	).rejects.toMatchObject({ statusCode: 503 });
	await expect(run(() => readObject("privados/../test.png"))).rejects.toMatchObject({
		statusCode: 404,
	});
	expect(fetch).not.toHaveBeenCalled();
});
it("oculta errores del proveedor y distingue objetos ausentes", async () => {
	const fetch = vi
		.fn()
		.mockResolvedValueOnce(Response.json({ statusCode: "404" }, { status: 400 }))
		.mockResolvedValueOnce(new Response("sensitive-provider-detail", { status: 403 }));
	vi.stubGlobal("fetch", fetch);
	await expect(run(() => readObject("publicos/test.png"))).rejects.toMatchObject({
		statusCode: 404,
	});
	await expect(run(() => readObject("publicos/test.png"))).rejects.toMatchObject({
		statusCode: 503,
		message: "No se pudo acceder al almacenamiento.",
	});
});
it("envía clave sólo al proveedor y elimina por prefijo exacto", async () => {
	const fetch = vi.fn().mockResolvedValue(Response.json({}));
	vi.stubGlobal("fetch", fetch);
	await run(() =>
		putObject("publicos/test.png", new File(["data"], "x.png", { type: "image/png" })),
	);
	let [url, init] = fetch.mock.calls[0]!;
	expect(url).toBe(
		"https://test.supabase.co/storage/v1/object/cerro-largo-files/publicos/test.png",
	);
	expect(init.redirect).toBe("manual");
	expect(new Headers(init.headers).get("x-upsert")).toBe("false");
	await run(() => deleteObject("privados/test.png"));
	[url, init] = fetch.mock.calls[1]!;
	expect(init.method).toBe("DELETE");
	expect(JSON.parse(init.body)).toEqual({ prefixes: ["privados/test.png"] });
});
it("HEAD devuelve metadatos sin transferir el archivo ni filtrar cabeceras internas", async () => {
	const fetch = vi.fn().mockResolvedValue(
		new Response(null, {
			headers: {
				"content-type": "image/png",
				"content-length": "4",
				etag: '"etag"',
				"set-cookie": "secret",
			},
		}),
	);
	vi.stubGlobal("fetch", fetch);
	const r = await run(() =>
		objectResponse("publicos/test.png", new Request("https://api.test/file", { method: "HEAD" })),
	);
	expect(r.status).toBe(200);
	expect(await r.text()).toBe("");
	expect(r.headers.get("content-length")).toBe("4");
	expect(r.headers.has("set-cookie")).toBe(false);
	expect(r.headers.has("authorization")).toBe(false);
	expect(fetch).toHaveBeenCalledTimes(1);
});
it("no sirve un rango si el proveedor lo ignora", async () => {
	const fetch = vi
		.fn()
		.mockResolvedValueOnce(new Response(null, { headers: { "content-length": "10" } }))
		.mockResolvedValueOnce(new Response("0123456789"));
	vi.stubGlobal("fetch", fetch);
	await expect(
		run(() =>
			objectResponse(
				"publicos/test.png",
				new Request("https://api.test/file", { headers: { range: "bytes=1-3" } }),
			),
		),
	).rejects.toMatchObject({ statusCode: 503 });
});
