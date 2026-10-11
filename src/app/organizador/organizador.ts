
import { Hono } from 'hono';
import {
  BadRequestError,
  UnauthorizedError
} from '../../configuracion/AppError.js';

import { prisma } from '../../configuracion/db.js';
import { bodyLimitado } from '../../middleware/Limit.js';
import { VerificarSessionRol } from '../../middleware/Session.js';

import { camposPerfil } from './organizador.consts.js';
import { datosPerfil } from './organizador.scheme.js';

// IMPORTAR LAS RUTAS DE EVENTOS
import { EventosRoute } from './eventos.js';

const app = new Hono();

// OBTENER PERFIL
app.get(
  '/perfil',
  VerificarSessionRol(['ORGANIZADOR']),
  async (c) => {
    const organizador = await prisma.organizador.findUnique({
      where: {
        id: Number(c.get('sesion').id)
      },
      select: camposPerfil
    });

    if (!organizador) {
      throw new UnauthorizedError();
    }

    return c.json(organizador);
  }
);

// ACTUALIZAR PERFIL
app.put(
  '/perfil',
  VerificarSessionRol(['ORGANIZADOR']),
  bodyLimitado(8, 'KB'),
  async (c) => {
    const datos = datosPerfil.safeParse(
      await c.req.json().catch(() => null)
    );

    if (!datos.success) {
      throw new BadRequestError(
        'Revisá los datos ingresados.'
      );
    }

    const id = Number(c.get('sesion').id);

    const existe = await prisma.organizador.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existe) {
      throw new UnauthorizedError();
    }

    const organizador = await prisma.organizador.update({
      where: { id },
      data: {
        nombre_organizacion:
          datos.data.nombre_organizacion,
        departamento: datos.data.departamento,
        telefono: datos.data.telefono,
        sitio_web: datos.data.sitio_web || null
      },
      select: camposPerfil
    });

    return c.json(organizador);
  }
);

// CONECTAR TODAS LAS RUTAS DE EVENTOS
app.route('/', EventosRoute);

export { app as OrganizadorRoute };
