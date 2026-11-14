import { Hono } from "hono";
import * as servicio from "./ubicaciones.service.js";

const app = new Hono();

app.get("/", async (c) => {
	const resultado = await servicio.listarPorCategoria(c.req.query());
	return c.json(resultado.datos, resultado.status);
});

export { app as UbicacionesRoute };
