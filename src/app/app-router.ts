import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { TuristaRoute } from "./turista/turista.js";
import { ModeracionValoracionesRoute } from "./admin/moderacion.js";
import { AdministradorRouter } from "./admin/admin-router.js";
import { PublicoRouter } from "./publico/publico-router.js";

const app = new Hono().basePath("/api");

// Ordenado según las áreas que consume el frontend.
app.route("/auth", AuthRoute);
app.route("/admin", AdministradorRouter);
app.route("/organizador", OrganizadorRoute);
app.route("/turista", TuristaRoute);

// Alias histórico usado por la página de moderación actual.
app.route("/moderacion-valoraciones", ModeracionValoracionesRoute);
app.route("/", PublicoRouter);

export { app as AppRouter };
