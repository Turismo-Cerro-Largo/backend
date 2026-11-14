import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import * as servicio from "./transporte.service.js";

const app = new Hono();

app.post("/empresas", RequerirAdministrador, bodyLimitado(12, "KB"), async (c) =>
	c.json(await servicio.crearEmpresa(await c.req.json().catch(() => null)), 201),
);

app.put("/empresas/:id", RequerirAdministrador, bodyLimitado(12, "KB"), async (c) =>
	c.json(await servicio.editarEmpresa(c.req.param("id")!, await c.req.json().catch(() => null))),
);

app.delete("/empresas/:id", RequerirAdministrador, async (c) =>
	c.json(await servicio.eliminarEmpresa(c.req.param("id")!)),
);

app.get("/horarios/admin", RequerirAdministrador, async (c) =>
	c.json(await servicio.listarHorariosAdmin()),
);

app.post("/horarios", RequerirAdministrador, bodyLimitado(12, "KB"), async (c) =>
	c.json(await servicio.crearHorario(await c.req.json().catch(() => null)), 201),
);

app.put("/horarios/:id", RequerirAdministrador, bodyLimitado(12, "KB"), async (c) =>
	c.json(await servicio.editarHorario(c.req.param("id")!, await c.req.json().catch(() => null))),
);

app.patch("/horarios/:id/estado", RequerirAdministrador, bodyLimitado(2, "KB"), async (c) =>
	c.json(
		await servicio.cambiarEstadoHorario(c.req.param("id")!, await c.req.json().catch(() => null)),
	),
);

app.delete("/horarios/:id", RequerirAdministrador, async (c) =>
	c.json(await servicio.eliminarHorario(c.req.param("id")!)),
);

export { app as TransporteAdminRoute };
