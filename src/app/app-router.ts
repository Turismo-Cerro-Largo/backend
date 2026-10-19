import { TuristaRoute } from "./turista/turista.js";
import { LugaresRoute } from "./turista/lugares.js";
import { ModeracionValoracionesRoute } from "./turista/moderacion.js";
import { PublicoRoute } from "./catalogo/catalogo.js";
import { consultarHorarios } from "./catalogo/transporte.js";
// src/app/app-router.ts
import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { HealthRoute } from "./health/health.js";
import { CategoriasRoute } from "./categorias/categorias.js";
import { ArchivosRoute } from "./archivos/archivos.js";
import { TransporteRoute } from "./transporte/transporte.js";
import { EventosRoute } from "./eventos/eventos.js";
import { DashboardAdminRoute } from "./admin/dashboard.js";
import { AdminEventosRoute } from "./admin/eventos.js";
import { AdminUbicacionesRoute } from "./admin/ubicaciones.js";
import { AdminUsuariosRoute } from "./admin/usuarios.js";
import { AdminComentariosRoute } from "./admin/comentarios.js";
import { UbicacionesRoute } from "./ubicaciones/ubicaciones.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);
app.route("/organizador", OrganizadorRoute);
app.route("/healt", HealthRoute);
app.route("/categorias", CategoriasRoute);
app.route("/archivos", ArchivosRoute);
app.route("/eventos", EventosRoute);
app.route("/transporte", TransporteRoute);
app.route("/admin/dashboard", DashboardAdminRoute);
app.route("/admin/eventos", AdminEventosRoute);
app.route("/admin/ubicaciones", AdminUbicacionesRoute);
app.route("/admin/usuarios", AdminUsuariosRoute);
app.route("/admin/comentarios", AdminComentariosRoute);
app.route("/ubicaciones", UbicacionesRoute);

app.route("/turista", TuristaRoute);
app.route("/lugares", LugaresRoute);
app.route("/moderacion-valoraciones", ModeracionValoracionesRoute);
app.get("/horarios-omnibus", consultarHorarios); // Compatibilidad de enlaces previos.
app.route("/", PublicoRoute);
export { app as AppRouter };