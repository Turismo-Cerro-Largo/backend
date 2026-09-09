import { Hono } from "hono";
import { userController } from "../controllers/usuario.controller.js";
import { usuarioRepository } from "../repositories/usuario.repository.js";

const app = new Hono()

app.get("/", userController.ObtenerTodos)
app.get("/:id", userController.ObtenerUno)
app.post("/", userController.CrearUno)
app.delete("/", userController.Limpiar)

export { app as UsuarioRouter }