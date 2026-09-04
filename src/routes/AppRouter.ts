import { Hono } from "hono";
import { userController } from "../controllers/userController.js";

const app = new Hono()

app.get("/usuario", userController.ObtenerTodos)
app.get("/usuario/:id", userController.ObtenerUno)
app.post("/usuario", userController.CrearUno)

export { app as AppRouter }