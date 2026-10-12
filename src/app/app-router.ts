// src/app/app-router.ts
import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { HealthRoute } from "./health/health.js";
import { CategoriasRoute } from "./categorias/categorias.js";
import { ArchivosRoute } from "./archivos/archivos.js";
import { EventosRoute } from "./eventos/eventos.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);
app.route("/organizador", OrganizadorRoute);
app.route("/healt", HealthRoute);
app.route("/categorias", CategoriasRoute);
app.route("/archivos", ArchivosRoute);
app.route("/eventos", EventosRoute);

export { app as AppRouter };