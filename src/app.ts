import { Hono } from 'hono'
import { Configuracion } from './configuracion/configuracion.js'
import 'dotenv/config'
import { AppRouter } from './routes/AppRouter.js'

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