// src/app/app-router.ts
import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { OrganizadorRoute } from "./organizador/organizador.js";
import { HealthRoute } from "./health/health.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);
app.route("/organizador", OrganizadorRoute);
app.route("/healt", HealthRoute)

export { app as AppRouter };