import { Hono } from "hono";
import { responderIconoLocalidad } from "../shared/localidad-icono.js";
import * as localidades from "./localidades.service.js";

const app = new Hono();

app.get("/", async (c) => c.json(await localidades.listar()));
app.get("/:slug/icono", async (c) =>
	responderIconoLocalidad(await localidades.obtenerIcono(c.req.param("slug"))),
);

export { app as LocalidadesRoute };
