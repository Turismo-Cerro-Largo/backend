import { Hono } from "hono";
import { BadRequestError } from "../../configuracion/AppError.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { RequerirOrganizador } from "../../middleware/Session.js";
import { datosPerfil } from "./organizador.scheme.js";
import { organizadorService } from "./organizador.service.js";
import { EventosRoute } from "./eventos.js";
import { OrganizadorAdminLegacyRoute } from "../admin/organizadores.js";

const app = new Hono();
const organizador = RequerirOrganizador;

app.get("/", organizador, async (c) =>
	c.json(await organizadorService.perfil(Number(c.get("sesion").id))));
app.put("/", organizador, bodyLimitado(8, "KB"), async (c) => {
	const datos = datosPerfil.safeParse(await c.req.json().catch(() => null));
	if (!datos.success) throw new BadRequestError("Revisá los datos ingresados.");
	return c.json(await organizadorService.editarPerfil(Number(c.get("sesion").id), datos.data));
});

app.route("/", EventosRoute);
app.route("/", OrganizadorAdminLegacyRoute);

export { app as OrganizadorRoute };
