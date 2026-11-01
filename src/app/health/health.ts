import { Hono } from "hono";
import { current } from "../../configuracion/runtime.js";
const app = new Hono();
app.get("/", async (c) => {
	try {
		await current().bindings.DB.prepare("SELECT 1").first();
		return c.json({ api: "ok", database: "ok" });
	} catch {
		return c.json({ api: "ok", database: "error" }, 503);
	}
});
export { app as HealthRoute };
