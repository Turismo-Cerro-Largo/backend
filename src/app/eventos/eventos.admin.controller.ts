import * as eventos from "./eventos.service.js";
import { type Context, Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";

const app = new Hono();
app.use("*", RequerirAdministrador);

app.get("/", async (c) => c.json(await eventos.listarAdmin(c.req.query())));
app.get("/calendario", async (c) => c.json(await eventos.calendarioAdmin(c.req.query())));
app.get("/:id", async (c) => c.json(await eventos.detalleAdmin(c.req.param("id"))));

async function cambiarEstadoEvento(c: Context) {
	return c.json(
		await eventos.cambiarEstado(await c.req.json().catch(() => null), c.req.param("id")!),
	);
}

app.patch("/:id/estado", cambiarEstadoEvento);

const legacy = new Hono();
legacy.patch("/:id/estado", RequerirAdministrador, cambiarEstadoEvento);

export { app as AdminEventosRoute, legacy as EventosAdminLegacyRoute };
