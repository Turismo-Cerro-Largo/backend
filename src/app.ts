import { Hono } from "hono";
import { AppRouter } from "./app/app-router.js";
import { Configuracion } from "./configuracion/configuracion.js";

const app = new Hono();

/**
 * Middlware
 */
Configuracion(app);

/**
 * Router
 */
app.route("/", AppRouter);

export { app };
