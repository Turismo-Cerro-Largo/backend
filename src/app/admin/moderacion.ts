import { Hono } from "hono";
import { moderacionEstadoSchema } from "./moderacion.schema.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { BadRequestError } from "../../configuracion/AppError.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { moderacionService } from "./moderacion.service.js";

const app = new Hono();
app.use("*", RequerirAdministrador);
app.use("*", bodyLimitado(8, "KB"));

app.get("/", async (c) =>
	c.json(await moderacionService.listar(c.req.query("estado"), c.req.query("pagina"))));

app.patch("/:id", async (c) => {
	const datos = moderacionEstadoSchema.safeParse(await c.req.json().catch(() => null));
	if (!datos.success) throw new BadRequestError();
	return c.json(await moderacionService.cambiarEstado(c.req.param("id"), datos.data.estado));
});

export { app as ModeracionValoracionesRoute };
