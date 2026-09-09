import 'dotenv/config'
import { Hono } from 'hono'
import { Configuracion } from './configuracion/configuracion.js'
import { AppRouter } from './routes/app.router.js';

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