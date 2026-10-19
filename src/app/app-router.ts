// src/app/app-router.ts
import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { HealthRoute } from "./health/health.js";
import { TuristaRoute } from "./turista/turista.js";
import { LugaresRoute } from "./turista/lugares.js";
import { ModeracionValoracionesRoute } from "./turista/moderacion.js";
import { UbicacionesRoute } from "./ubicaciones/ubicaciones.js";
import { PublicoRoute } from "./catalogo/catalogo.js";
import { TransporteRoute } from "./catalogo/transporte.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);
app.route("/organizador", OrganizadorRoute);
app.route("/healt", HealthRoute)
app.route("/turista", TuristaRoute);
app.route("/lugares", LugaresRoute);
app.route("/ubicaciones", UbicacionesRoute);
app.route("/horarios-omnibus", TransporteRoute);
app.route("/", PublicoRoute);
app.route("/moderacion-valoraciones", ModeracionValoracionesRoute);

export { app as AppRouter };
