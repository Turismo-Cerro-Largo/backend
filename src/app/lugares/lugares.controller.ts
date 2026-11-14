import { Hono } from "hono";
import * as servicio from "./lugares.service.js";

const app = new Hono();

app.get("/", async (c) => c.json(await servicio.listar(c.req.query())));

app.get("/:id", async (c) => c.json(await servicio.detalle(c.req.param("id")!)));

export { app as LugaresRoute };
