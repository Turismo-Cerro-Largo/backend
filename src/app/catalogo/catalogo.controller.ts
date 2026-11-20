import { leerSesion } from "../../middleware/Session.js";
import { Hono } from "hono";
import * as servicio from "./catalogo.service.js";

const app = new Hono();

app.get("/mapa/lugares", async (c) => c.json(await servicio.lugaresMapa(c.req.query())));

app.get("/recursos/:id", (c) =>
	servicio.servirRecurso(c.req.param("id"), c.req.header("range"), c.req.method === "HEAD", () =>
		leerSesion(c),
	),
);

export { app as PublicoRoute };
