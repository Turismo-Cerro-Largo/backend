import { Hono } from "hono";
import { AppRouter } from "./app/app-router.js";
import { Configuracion } from "./configuracion/configuracion.js";
import "dotenv/config";

const app = new Hono();

/**
 * Middlware
 */
Configuracion(app);

/**
 * Router
 */
app.route("/api", AppRouter);

export { app };
