import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.controller.js";
import { OrganizadorRoute } from "./organizadores/organizador.controller.js";
import { TuristaRoute } from "./turista/turista.controller.js";
import { RecuperacionRoute } from "./auth/recuperacion.controller.js";
import { VerificacionRoute } from "./auth/verificacion.controller.js";
import { EventosRoute as EventosOrganizadorRoute } from "./eventos/eventos.organizador.controller.js";
import { OrganizadorAdminLegacyRoute } from "./organizadores/organizadores.admin.controller.js";
import { DashboardAdminRoute } from "./dashboard/dashboard.admin.controller.js";
import { AdminEventosRoute, EventosAdminLegacyRoute } from "./eventos/eventos.admin.controller.js";
import { AdminUbicacionesRoute } from "./ubicaciones/ubicaciones.admin.controller.js";
import { AdminLocalidadesRoute } from "./localidades/localidades.admin.controller.js";
import { AdminUsuariosRoute } from "./usuarios/usuarios.admin.controller.js";
import { AdminComentariosRoute } from "./comentarios/comentarios.admin.controller.js";
import { ModeracionValoracionesRoute } from "./comentarios/moderacion.admin.controller.js";
import { AdminOrganizadoresRoute } from "./organizadores/organizadores.admin.controller.js";
import { HealthRoute } from "./health/health.controller.js";
import { CategoriasAdminRoute } from "./categorias/categorias.admin.controller.js";
import { CategoriasRoute } from "./categorias/categorias.controller.js";
import { ArchivosRoute } from "./archivos/archivos.controller.js";
import { TransporteAdminRoute } from "./transporte/transporte.admin.controller.js";
import { TransporteRoute } from "./transporte/transporte.controller.js";
import { EventosRoute } from "./eventos/eventos.controller.js";
import { UbicacionesRoute } from "./ubicaciones/ubicaciones.controller.js";
import { LugaresRoute } from "./lugares/lugares.controller.js";
import { LocalidadesRoute } from "./localidades/localidades.controller.js";
import { PublicoRoute } from "./catalogo/catalogo.controller.js";
import { consultarHorarios } from "./transporte/horarios.controller.js";

const app = new Hono().basePath("/api");

app.route("/auth/verificacion", VerificacionRoute);
app.route("/auth/recuperacion", RecuperacionRoute);
app.route("/auth", AuthRoute);

app.route("/admin/dashboard", DashboardAdminRoute);
app.route("/admin/eventos", AdminEventosRoute);
app.route("/admin/ubicaciones", AdminUbicacionesRoute);
app.route("/admin/localidades", AdminLocalidadesRoute);
app.route("/admin/usuarios", AdminUsuariosRoute);
app.route("/admin/organizadores", AdminOrganizadoresRoute);
app.route("/admin/comentarios", AdminComentariosRoute);
app.route("/admin/valoraciones", ModeracionValoracionesRoute);

app.route("/organizador", OrganizadorRoute);
app.route("/organizador", EventosOrganizadorRoute);
app.route("/organizador", OrganizadorAdminLegacyRoute);
app.route("/turista", TuristaRoute);
app.route("/moderacion-valoraciones", ModeracionValoracionesRoute);

app.route("/healt", HealthRoute);
app.route("/categorias", CategoriasRoute);
app.route("/categorias", CategoriasAdminRoute);
app.route("/archivos", ArchivosRoute);
app.route("/transporte", TransporteAdminRoute);
app.route("/transporte", TransporteRoute);
app.route("/eventos", EventosRoute);
app.route("/eventos", EventosAdminLegacyRoute);
app.route("/ubicaciones", UbicacionesRoute);
app.route("/lugares", LugaresRoute);
app.route("/localidades", LocalidadesRoute);
app.get("/horarios-omnibus", consultarHorarios);
app.route("/", PublicoRoute);

export { app as AppRouter };
