import { Hono, type Context } from "hono";
import { BadRequestError } from "../../configuracion/AppError.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { organizador_estado_scheme } from "./organizadores.schema.js";
import { organizadoresAdminService as service } from "./organizadores.service.js";

const listar = (c: Context) =>
	service.listar(c.req.query("estado"), c.req.query("offset"), c.req.query("limit")).then((datos) => c.json(datos));
const detalle = (c: Context) => service.detalle((c.req.param("id") ?? "")).then((datos) => c.json(datos));
const cambiarEstado = async (c: Context) => {
	const datos = organizador_estado_scheme.safeParse(await c.req.json().catch(() => null));
	if (!datos.success) throw new BadRequestError();
	return c.json(await service.cambiarEstado((c.req.param("id") ?? ""), datos.data));
};

const admin = new Hono();
admin.use("*", RequerirAdministrador);
admin.get("/", listar);
admin.get("/:id", detalle);
admin.patch("/:id/estado", bodyLimitado(8, "KB"), cambiarEstado);

// Compatibilidad con el frontend existente: /api/organizador/lista y /:id.
const legacy = new Hono();
legacy.get("/lista", RequerirAdministrador, listar);
legacy.get("/:id", RequerirAdministrador, detalle);
legacy.patch("/:id/estado", RequerirAdministrador, bodyLimitado(8, "KB"), cambiarEstado);

export { admin as AdminOrganizadoresRoute, legacy as OrganizadorAdminLegacyRoute };
