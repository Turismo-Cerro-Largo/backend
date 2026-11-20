import { consultarHorarios } from "./horarios.controller.js";
import { Hono } from "hono";
import * as servicio from "./transporte.service.js";

const app = new Hono();

app.get("/empresas", async (c) => c.json(await servicio.listarEmpresas()));

app.get("/empresas/:id", async (c) => c.json(await servicio.detalleEmpresa(c.req.param("id")!)));

app.get("/horarios", consultarHorarios);

app.get("/horarios/:id", async (c) => c.json(await servicio.detalleHorario(c.req.param("id")!)));

export { app as TransporteRoute };
