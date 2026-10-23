import "dotenv/config";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { mkdtemp, readFile, readdir, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ArchivosFotoPerfil, ArchivosPublicos, borrar_publicos } from "../src/middleware/Archivos.js";
import { app } from "../src/app.js";
import { validarArchivo } from "../src/services/archivos.service.js";

const origen = (process.env.APP_ORIGINS || "http://localhost:5173").split(",")[0]!;

describe("rutas por área y middleware", () => {
	const rutas = new Set(app.routes.map((ruta) => ruta.method + " " + ruta.path));

	it("conserva los contratos consumidos por los tres paneles y agrega alias administradores", () => {
		for (const ruta of [
			"GET /api/admin/dashboard",
			"GET /api/admin/organizadores",
			"GET /api/organizador/lista",
			"GET /api/organizador/eventos",
			"GET /api/turista/perfil",
			"POST /api/turista/lugares/:id/valoracion",
			"GET /api/lugares/:id",
			"GET /api/archivos/publicos/seed/:archivo",
		]) expect(rutas.has(ruta), ruta).toBe(true);
	});

	it("rechaza una petición administrativa sin sesión", async () => {
		const respuesta = await app.request("/api/admin/organizadores");
		expect(respuesta.status).toBe(401);
	});

	it("separa las rutas del organizador de las administrativas heredadas", async () => {
    const eventos = await app.request("/api/organizador/eventos");
    const listadoAdmin = await app.request("/api/organizador/lista");
    expect(eventos.status).toBe(401);
    expect(listadoAdmin.status).toBe(401);
  });

  it("rechaza una petición del turista sin sesión", async () => {
		const respuesta = await app.request("/api/turista/perfil");
		expect(respuesta.status).toBe(401);
	});

	it("rechaza mutaciones de origen no autorizado antes de procesar archivos", async () => {
		const respuesta = await app.request("/api/admin/ubicaciones/recursos/upload", {
			method: "POST",
			headers: { origin: "https://origen-no-autorizado.example" },
		});
		expect(respuesta.status).toBe(403);
	});

	it("rechaza mutaciones sin sesión aun con origen permitido", async () => {
		const respuesta = await app.request("/api/admin/ubicaciones/recursos/upload", {
			method: "POST",
			headers: { origin: origen },
		});
		expect(respuesta.status).toBe(401);
	});
});

describe("validación de archivos", () => {
	it("acepta GIF, MP4 y WebM auténticos para el panel administrador", async () => {
		const casos = [
			new File([new Uint8Array([71, 73, 70, 56, 57, 97, 0, 0, 0, 0, 0, 0])], "imagen.gif", { type: "image/gif" }),
			new File([new Uint8Array([0, 0, 0, 16, 102, 116, 121, 112, 0, 0, 0, 0])], "video.mp4", { type: "video/mp4" }),
			new File([new Uint8Array([26, 69, 223, 163, 0, 0, 0, 0, 0, 0, 0, 0])], "video.webm", { type: "video/webm" }),
		];
		for (const archivo of casos)
			await expect(validarArchivo(archivo, ["gif", "mp4", "webm"], 1)).resolves.toBe(archivo.name.split(".").pop());
	});

	it("rechaza contenido disfrazado y formato ajeno a la ruta", async () => {
		const falso = new File([new Uint8Array(16)], "falso.png", { type: "image/png" });
		await expect(validarArchivo(falso, ["png"], 1)).rejects.toMatchObject({ statusCode: 400 });
		const video = new File([new Uint8Array([0, 0, 0, 16, 102, 116, 121, 112, 0, 0, 0, 0])], "video.mp4", { type: "video/mp4" });
		await expect(validarArchivo(video, ["jpg"], 1)).rejects.toMatchObject({ statusCode: 400 });
	});
});

describe("subida de foto de perfil", () => {
	it("guarda una foto con el middleware y limpia el archivo si falla el controlador", async () => {
		const directorio = await mkdtemp(path.join(tmpdir(), "cerro-foto-"));
		const anterior = process.env.TURISTA_PHOTO_DIR;
		process.env.TURISTA_PHOTO_DIR = directorio;
		const jpeg = new File(
			[new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0])],
			"perfil.jpeg",
			{ type: "image/jpeg" },
		);
		const peticion = () => {
			const body = new FormData();
			body.set("foto", jpeg);
			return new Request("http://localhost/foto", { method: "PUT", body });
		};
		try {
			const correcto = new Hono();
			correcto.put("/foto", ArchivosFotoPerfil(), (c) => c.json({ nombre: c.get("fotoPerfil") }));
			const respuesta = await correcto.request(peticion());
			expect(respuesta.status).toBe(200);
			const { nombre } = await respuesta.json() as { nombre: string };
			expect(nombre.endsWith(".jpg")).toBe(true);
			expect(await readFile(path.join(directorio, nombre))).toHaveLength(12);

			const fallido = new Hono();
			fallido.put("/foto", ArchivosFotoPerfil(), () => {
				throw new Error("Fallo después de cargar");
			});
			expect((await fallido.request(peticion())).status).toBe(500);
			expect(await readdir(directorio)).toEqual([nombre]);
			await unlink(path.join(directorio, nombre));
		} finally {
			if (anterior === undefined) delete process.env.TURISTA_PHOTO_DIR;
			else process.env.TURISTA_PHOTO_DIR = anterior;
			for (const nombre of await readdir(directorio)) await unlink(path.join(directorio, nombre));
			await rmdir(directorio);
		}
	});
});

describe("formularios multipart de recursos", () => {
	it("acepta varios archivos y omite el selector vacío", async () => {
		const ruta = new Hono();
		ruta.post("/recursos", ArchivosPublicos(["jpg"], 1, 3), async (c) => {
			const nombres = c.get("recursos");
			await borrar_publicos(nombres);
			return c.json({ cantidad: nombres.length });
		});
		const vacio = new FormData();
		vacio.set("recursos", new File([], "", { type: "application/octet-stream" }));
		const sinArchivo = await ruta.request(new Request("http://localhost/recursos", { method: "POST", body: vacio }));
		expect(sinArchivo.status).toBe(200);
		expect(await sinArchivo.json()).toEqual({ cantidad: 0 });

		const body = new FormData();
		for (const nombre of ["uno.jpg", "dos.jpg"]) {
			body.append("recursos", new File([new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0])], nombre, { type: "image/jpeg" }));
		}
		const respuesta = await ruta.request(new Request("http://localhost/recursos", { method: "POST", body }));
		expect(respuesta.status).toBe(200);
		expect(await respuesta.json()).toEqual({ cantidad: 2 });
	});
});
