// src/app/app-router.ts
import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { HealthRoute } from "./health/health.js";
import { CategoriasRoute } from "./categorias/categorias.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);
app.route("/organizador", OrganizadorRoute);
<<<<<<< HEAD
app.route("/healt", HealthRoute)
=======
app.route("/healt", HealthRoute);
app.route("/categorias", CategoriasRoute);
// Comprobar que el servidor y MySQL responden.
>>>>>>> 713913d (Integracion de api de categorias)

export { app as AppRouter };