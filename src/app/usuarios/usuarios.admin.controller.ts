import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import * as servicio from "./usuarios.admin.service.js";

const app = new Hono();

app.use("*", RequerirAdministrador);

app.get("/", async (c) => c.json(await servicio.listar(c.req.query())));

app.get("/:id/favoritos", async (c) =>
	c.json(await servicio.favoritos(c.req.param("id")!, c.req.query())),
);

app.get("/:id", async (c) => c.json(await servicio.detalle(c.req.param("id")!)));

export { app as AdminUsuariosRoute };
