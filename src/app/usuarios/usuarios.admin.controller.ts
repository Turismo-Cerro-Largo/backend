import { estadoAcceso } from "../shared/acceso-admin.schema.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import * as servicio from "./usuarios.admin.service.js";

const app = new Hono();

app.use("*", RequerirAdministrador);

app.post("/", bodyLimitado(4, "KB"), async (c) =>
	c.json(await servicio.crearAdministrador(await c.req.json().catch(() => null)), 201),
);

app.get("/", async (c) => c.json(await servicio.listar(c.req.query())));

app.get("/:id/favoritos", async (c) =>
	c.json(await servicio.favoritos(c.req.param("id")!, c.req.query())),
);

app.get("/:id", async (c) => c.json(await servicio.detalle(c.req.param("id")!)));

app.patch("/:id/acceso", bodyLimitado(2, "KB"), async (c) =>
	c.json(
		await servicio.cambiarAcceso(
			c.req.param("id"),
			estadoAcceso(await c.req.json().catch(() => null)),
		),
	),
);
app.delete("/:id", async (c) => {
	await servicio.cambiarAcceso(c.req.param("id"), "ELIMINADO");
	return c.body(null, 204);
});

export { app as AdminUsuariosRoute };
