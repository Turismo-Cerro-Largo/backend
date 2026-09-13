import type { Context } from "hono";
import { userService } from "../services/user.service.js";
import { CrearUsuarioSchema } from "../schemas/user.schema.js";
import { ValidationError } from "../errors/errors.js";

export const userController = {

    async ObtenerTodos(c: Context) {
        const usuarios = await userService.obtenerTodos();
        return c.json({ msg: usuarios }, 200);
    },

    async ObtenerUno(c: Context) {
        const { id } = c.req.param();
        const usuario = await userService.obtenerUno(Number(id));
        return c.json({ msg: usuario }, 200);
    },

    async CrearUno(c: Context) {
        const body = await c.req.json();
        const datos = CrearUsuarioSchema.safeParse(body);
        if (!datos.success) throw new ValidationError("Error en el formato de los datos");

        const usuario = await userService.crearUno(datos.data);
        return c.json({ msg: usuario }, 201);
    }
};