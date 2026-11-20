import { Hono } from "hono";
import { bodyLimitado } from "../../middleware/Limit.js";
import * as servicio from "./verificacion.service.js";

const app = new Hono();

app.use("*", bodyLimitado(4, "KB"));

app.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	await next();
});

app.post("/confirmar", async (c) => {
	const resultado = await servicio.confirmar(await c.req.json().catch(() => null));
	return c.json(resultado.datos, resultado.status);
});

app.post("/reenviar", async (c) => {
	const resultado = await servicio.reenviar(await c.req.json().catch(() => null));
	return c.json(resultado.datos, resultado.status);
});

export { app as VerificacionRoute };
