import type { Context } from "hono";
import { prisma } from "../configuracion/db.js";
import { CrearUsuarioSchema } from "../schemas/user.schema.js";

export const userController = {

    async ObtenerTodos(c: Context) {
        try {
            const usuarios = await prisma.usuario.findMany();
            return c.json({ msg: usuarios }, 200);
        } catch (error) {
            console.log(error);
            return c.json({ msg: "Error" }, 500);
        }
    },

    async ObtenerUno(c: Context) {
        /**
         * Referencia: https://hono.dev/docs/api/request
         */
        const { id } = c.req.param();

        try {
            const usuario = await prisma.usuario.findUniqueOrThrow({
                where: { id: Number(id) }
            });
            return c.json({ msg: usuario }, 200);
        } catch (error) {
            return c.json({ msg: "Usuario no encontrado" }, 403);
        }
    },

    async CrearUno(c: Context) {
        try {
            /**
             * https://hono.dev/docs/api/request
             */
            const body = await c.req.json();

            // https://zod.dev/basics
            const datos = CrearUsuarioSchema.safeParse(body);

            if (!datos.success) {
                return c.json({ msg: "Error en el formato de los datos" }, 400);
            }

            const usuario = await prisma.usuario.create({
                data: {
                    username: datos.data.username,
                    email: datos.data.email
                }
            });

            return c.json({ msg: usuario }, 200);
        } catch (error) {
            return c.json({ msg: "Usuario no creado" }, 403);
        }
    }
};