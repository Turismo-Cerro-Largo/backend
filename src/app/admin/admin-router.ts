import { Hono } from "hono";
import { DashboardAdminRoute } from "./dashboard.js";
import { AdminEventosRoute } from "./eventos.js";
import { AdminUbicacionesRoute } from "./ubicaciones.js";
import { AdminLocalidadesRoute } from "./localidades.js";
import { AdminUsuariosRoute } from "./usuarios.js";
import { AdminComentariosRoute } from "./comentarios.js";
import { ModeracionValoracionesRoute } from "./moderacion.js";
import { AdminOrganizadoresRoute } from "./organizadores.js";

// Rutas propias del panel administrador. Los alias antiguos siguen en app-router.ts.
const app = new Hono();
app.route("/dashboard", DashboardAdminRoute);
app.route("/eventos", AdminEventosRoute);
app.route("/ubicaciones", AdminUbicacionesRoute);
app.route("/localidades", AdminLocalidadesRoute);
app.route("/usuarios", AdminUsuariosRoute);
app.route("/organizadores", AdminOrganizadoresRoute);
app.route("/comentarios", AdminComentariosRoute);
app.route("/valoraciones", ModeracionValoracionesRoute);

export { app as AdministradorRouter };
