import { Hono } from "hono";
import { UsuarioRouter } from "./usuario.router.js";

const app = new Hono()

app.route("/usuario", UsuarioRouter)

export { app as AppRouter }