import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import * as servicio from "./comentarios.admin.service.js";

const app = new Hono();

app.use("*", RequerirAdministrador);

app.use("*", async (c, next) => {
	await servicio.verificarCuenta(c.get("sesion"));
	await next();
});

app.get("/", async (c) => c.json(await servicio.listar(c.req.query())));

app.get("/:id", async (c) => c.json(await servicio.detalle(c.req.param("id")!)));

app.patch("/:id/estado", async (c) =>
	c.json(await servicio.cambiarEstado(c.req.param("id")!, await c.req.json().catch(() => null))),
);

export { app as AdminComentariosRoute };
