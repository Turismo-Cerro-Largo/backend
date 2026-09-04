import type { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

/**
 * Helper para cargar los middleware
 * @param app 
 */
export const Configuracion = (app: Hono) => {

    app.use("*", logger())

    app.use("*", cors())

    app.use("*", secureHeaders())
}