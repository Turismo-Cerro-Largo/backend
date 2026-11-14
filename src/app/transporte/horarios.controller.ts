import type { Context } from "hono";
import * as servicio from "./transporte.service.js";

export const consultarHorarios = async (c: Context) =>
	c.json(await servicio.consultarHorarios(c.req.query()));
