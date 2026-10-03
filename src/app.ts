import { Hono } from 'hono'
import { Configuracion } from './configuracion/configuracion.js'
import { AppRouter } from './app/app-router.js';
import 'dotenv/config'

const app = new Hono()

/**
 * Middlware
 */
Configuracion(app);

/**
 * Router
 */
app.route("/api", AppRouter)

export { app }