import { estadoAcceso } from "../shared/acceso-admin.schema.js";
import { cambiarAcceso, eliminar } from "./organizadores.admin.service.js";
import { Hono, type Context } from "hono";
import { BadRequestError } from "../../configuracion/AppError.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { organizador_estado_scheme } from "./organizadores.admin.schema.js";
import { organizadoresAdminService as service } from "./organizadores.admin.service.js";

const listar = (c: Context) =>
	service
		.listar(c.req.query("estado"), c.req.query("offset"), c.req.query("limit"))
		.then((datos) => c.json(datos));
const detalle = (c: Context) =>
	service.detalle(c.req.param("id") ?? "").then((datos) => c.json(datos));
const cambiarEstado = async (c: Context) => {
	const datos = organizador_estado_scheme.safeParse(await c.req.json().catch(() => null));
	if (!datos.success) throw new BadRequestError();
	return c.json(await service.cambiarEstado(c.req.param("id") ?? "", datos.data));
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

admin.patch("/:id/acceso", bodyLimitado(2, "KB"), async (c) =>
	c.json(
		await cambiarAcceso(c.req.param("id"), estadoAcceso(await c.req.json().catch(() => null))),
	),
);
admin.delete("/:id", async (c) => {
	await eliminar(c.req.param("id"));
	return c.body(null, 204);
});

export { admin as AdminOrganizadoresRoute, legacy as OrganizadorAdminLegacyRoute };
