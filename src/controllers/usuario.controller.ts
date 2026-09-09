import type { Context } from 'hono';
import { usuarioService } from '../services/usuario.service.js';
import { CrearUsuarioSchema } from '../schemas/user.schema.js';
import { prisma } from '../configuracion/db.js';

export const userController = {

    async ObtenerTodos(c: Context) {
        try {
            const usuarios = await usuarioService.obtenerTodos();
            return c.json({ msg: usuarios }, 200);
        } catch (error) {
            console.log(error);
            return c.json({ error: 'Error al obtener usuarios' }, 500);
        }
    },

    async ObtenerUno(c: Context) {
        try {
            const { id } = c.req.param();

            if (!id || isNaN(Number(id))) {
                return c.json({ error: 'ID invalido' }, 400);
            }

            const usuario = await usuarioService.obtenerPorId(Number(id));
            return c.json({ msg: usuario }, 200);
        } catch (error: any) {
            if (error.message === 'Usuario no encontrado') {
                return c.json({ error: error.message }, 404);
            }
            return c.json({ error: 'Error al obtener usuario' }, 500);
        }
    },

    async CrearUno(c: Context) {
        try {
            const body = await c.req.json();

            const datos = CrearUsuarioSchema.safeParse(body);
            if (!datos.success) {
                return c.json({ error: 'Formato de datos invalido' }, 400);
            }

            const usuario = await usuarioService.crear(datos.data);
            return c.json({ msg: usuario }, 201);
        } catch (error: any) {
            if (error.message === 'Email ya registrado') {
                return c.json({ error: error.message }, 409);
            }
            return c.json({ error: 'Error al crear usuario' }, 500);
        }
    },

    async Limpiar(c: Context) {
        try {
            const datos = usuarioService.limpiar()

            return c.json({ msg: datos })
        } catch (error) {
            return c.json({ error: 'Error al limpiar la base datos' }, 500);

        }
    }
};