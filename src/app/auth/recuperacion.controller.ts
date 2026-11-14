import { Hono } from "hono";
import { bodyLimitado } from "../../middleware/Limit.js";
import { verificarTurnstile } from "../../middleware/Turnstile.js";
import * as servicio from "./recuperacion.service.js";

const app = new Hono();

app.use("*", bodyLimitado(4, "KB"));

app.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	c.header("Referrer-Policy", "no-referrer");
	await next();
});

app.post("/solicitar", verificarTurnstile("recuperar-contrasena", "json"), async (c) => {
	const resultado = await servicio.solicitar(await c.req.json().catch(() => null));
	return c.json(resultado.datos, resultado.status);
});

app.post("/confirmar", async (c) => {
	const resultado = await servicio.confirmar(await c.req.json().catch(() => null));
	return c.json(resultado.datos, resultado.status);
});

export { app as RecuperacionRoute };
