
// src/app/app-router.ts

import { Hono } from "hono";

import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { HealthRoute } from "./health/health.js";
import { ArchivosRoute } from "./archivos/archivos.js";
import { UbicacionesRoute } from "./ubicaciones/ubicaciones.js";

const app = new Hono().basePath("/api");

// Autenticación
app.route("/auth", AuthRoute);

// Organizador
app.route("/organizador", OrganizadorRoute);

// Estado del servidor
app.route("/healt", HealthRoute);

// Archivos
app.route("/archivos", ArchivosRoute);

// Ubicaciones
app.route("/ubicaciones", UbicacionesRoute);

export { app as AppRouter };
