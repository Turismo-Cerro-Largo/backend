import { Hono } from "hono";
import { comprobarSalud } from "./health.service.js";

const app = new Hono();

app.get("/", async (c) => {
	const resultado = await comprobarSalud();
	return c.json({ api: "ok", ...resultado }, resultado.database === "ok" ? 200 : 503);
});

export { app as HealthRoute };
