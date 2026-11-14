import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { ArchivosPublicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { responderIconoLocalidad } from "../shared/localidad-icono.js";
import * as servicio from "./localidades.admin.service.js";

const app = new Hono();

app.use("*", RequerirAdministrador);

app.get("/", async (c) => c.json(await servicio.listar()));

app.get("/:id/icono", async (c) =>
	responderIconoLocalidad(await servicio.icono(c.req.param("id"))),
);

app.post(
	"/",
	bodyLimitado(3, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 2, 1),
	async (c) =>
		c.json(await servicio.crear(await c.req.parseBody({ all: true }), c.get("recursos")), 201),
);

app.put(
	"/:id",
	bodyLimitado(3, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 2, 1),
	async (c) =>
		c.json(
			await servicio.editar(
				c.req.param("id")!,
				await c.req.parseBody({ all: true }),
				c.get("recursos"),
			),
		),
);

app.delete("/:id", async (c) => {
	await servicio.eliminar(c.req.param("id")!);
	return c.body(null, 204);
});

export { app as AdminLocalidadesRoute };
