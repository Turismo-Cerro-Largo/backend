import { Hono } from 'hono'
import { Configuracion } from './configuracion/configuracion.js'
import 'dotenv/config'
import { AppRouter } from './routes/AppRouter.js'
import { AppError } from './errors/errors.js'

const app = new Hono()

/**
 * Middlware
 */
Configuracion(app);

/**
 * Router
 */
app.route("/api", AppRouter)

/**
 * Manejo de errores centralizado
 */
app.onError((err, c) => {
    if (err instanceof AppError) {
        return c.json({ msg: err.message }, err.status as any);
    }
    console.error(err);
    return c.json({ msg: "Error interno del servidor" }, 500);
});

export { app }