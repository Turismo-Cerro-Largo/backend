import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { ArchivosPublicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import * as servicio from "./ubicaciones.admin.service.js";

const app = new Hono();

app.use("*", RequerirAdministrador);

app.post(
	"/recursos/upload",
	bodyLimitado(82, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"], 80, 20),
	async (c) => c.json(await servicio.mapearCarga(c.get("recursos")), 201),
);

app.get("/", async (c) => c.json(await servicio.listar(c.req.query())));

app.get("/:id", async (c) => c.json(await servicio.detalle(c.req.param("id")!)));

app.post("/", async (c) => {
	const resultado = await servicio.crear(await c.req.json().catch(() => null));
	return c.json(resultado.datos, resultado.status);
});

app.put("/:id", async (c) => {
	const resultado = await servicio.editar(c.req.param("id")!, await c.req.json().catch(() => null));
	return c.json(resultado.datos, resultado.status);
});

app.patch("/:id/estado", async (c) =>
	c.json(await servicio.cambiarEstado(c.req.param("id")!, await c.req.json().catch(() => null))),
);

app.delete("/:id", async (c) => {
	await servicio.eliminar(c.req.param("id")!);
	return c.body(null, 204);
});

export { app as AdminUbicacionesRoute };
