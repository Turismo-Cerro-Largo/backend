import { recursoVisible } from "../catalogo/acceso-recursos.js";
// src/app/organizador/eventos.ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { formulario, type Datos } from './eventos.schema.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} from '../../configuracion/AppError.js';
import { prisma } from '../../configuracion/db.js';
import { ArchivosPublicos, borrar_publicos } from '../../middleware/Archivos.js';
import { bodyLimitado } from '../../middleware/Limit.js';
import { RequerirOrganizadorAprobado } from '../../middleware/Session.js';

const app = new Hono();

function validarDatos(datos: Datos) {
  const inicio = new Date(datos.inicio);
  const fin = datos.fin ? new Date(datos.fin) : null;
  if (fin && (Number.isNaN(fin.getTime()) || fin <= inicio)) {
    throw new BadRequestError('La fecha de finalización debe ser posterior al inicio.');
  }
  const parseCoordenada = (valor: string, limite: number): number | null => {
    if (!valor) return null;
    const n = Number(valor);
    if (!Number.isFinite(n) || Math.abs(n) > limite) {
      throw new BadRequestError('Coordenadas inválidas.');
    }
    return n;
  };
  const latitud = parseCoordenada(datos.latitud, 90);
  const longitud = parseCoordenada(datos.longitud, 180);
  if ((latitud === null) !== (longitud === null)) {
    throw new BadRequestError('Ingresá ambas coordenadas.');
  }
  const precio = datos.precio.trim() ? Number(datos.precio) : null;
  if (precio !== null && (!Number.isFinite(precio) || precio < 0 || precio > 99999999.99)) {
    throw new BadRequestError('Precio inválido.');
  }
  if (datos.accion === 'revision') {
    if (!datos.localidad || !datos.direccion || latitud === null || longitud === null) {
      throw new BadRequestError('Para enviar a revisión, completá lugar y ubicación en el mapa.');
    }
    if (datos.es_gratuito === 'false' && (precio === null || precio <= 0)) {
      throw new BadRequestError('Ingresá un precio mayor a cero para entradas pagas.');
    }
  }
  const lugar = [datos.direccion, datos.localidad].filter(Boolean).join(' | ');
  if (lugar.length > 255) throw new BadRequestError('La dirección es demasiado larga.');
  const contacto = JSON.stringify({
    telefono: datos.telefono,
    correo: datos.correo,
    redes: datos.redes
  });
  if (contacto.length > 255) throw new BadRequestError('Los datos de contacto son demasiado largos.');

  return {
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    inicio,
    fin,
    id_categoria: datos.id_categoria,
    lugar_evento: lugar || null,
    latitud,
    longitud,
    es_gratuito: datos.es_gratuito === 'true',
    precio: datos.es_gratuito === 'true' ? null : precio,
    contacto,
    estado: datos.accion === 'revision' ? 'PENDIENTE_REVISION' as const : 'BORRADOR' as const,
    motivo_rechazo: null
  };
}

function transformarBody(body: Record<string, unknown>) {
  const parsed = formulario.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Revisá los datos del evento, la categoría, las fechas y el contacto.');
  }
  return parsed.data;
}

function idOrganizador(sesion: { id: string }) {
  const id = Number(sesion.id);
  if (!Number.isInteger(id) || id <= 0) throw new ForbiddenError();
  return id;
}

async function verificarCategoria(id: number) {
  const categoria = await prisma.categoria.findUnique({ where: { id }, select: { id: true } });
  if (!categoria) throw new BadRequestError('Seleccioná una categoría existente.');
}

const incluir = {
  categoria: { select: { id: true, nombre: true } },
  recursos: { where: { tipo: 'IMAGEN' as const }, select: { id: true, uri: true, tipo: true }, orderBy: { orden: 'asc' as const } }
};

app.get('/eventos/media/:nombre', async c => {
  const nombre = c.req.param('nombre');
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) throw new NotFoundError();
  const recurso = await recursoVisible(c,{uri:`/api/organizador/eventos/media/${nombre}`});
  if(!recurso)throw new NotFoundError();
  return c.redirect(`/api/recursos/${recurso.id}`,307);
});

app.get('/eventos/categorias', RequerirOrganizadorAprobado, async c => {
  const categorias = await prisma.categoria.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
  return c.json({ categorias });
});

app.get('/eventos', RequerirOrganizadorAprobado, async c => {
  const eventos = await prisma.evento.findMany({
    where: { id_organizador: idOrganizador(c.get('sesion')) },
    include: incluir,
    orderBy: { creado_en: 'desc' }
  });
  return c.json({ eventos });
});

app.get('/eventos/:id', RequerirOrganizadorAprobado, async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Identificador inválido.');
  const evento = await prisma.evento.findFirst({ where: { id, id_organizador: idOrganizador(c.get('sesion')) }, include: incluir });
  if (!evento) throw new NotFoundError('No se encontró el evento.');
  return c.json({ evento });
});

app.post(
  '/eventos',
  RequerirOrganizadorAprobado,
  bodyLimitado(26, 'MB'),
  ArchivosPublicos(['jpg', 'jpeg', 'png', 'webp'], 5, 5),
  async c => {
    const recursos = c.get('recursos');
    if (recursos.length > 5) {
      await borrar_publicos(recursos);
      throw new BadRequestError('Podés agregar hasta cinco imágenes por operación.');
    }
    const datos = validarDatos(transformarBody(await c.req.parseBody({ all: true })));
    await verificarCategoria(datos.id_categoria);
    const evento = await prisma.evento.create({
      data: {
        ...datos,
        id_organizador: idOrganizador(c.get('sesion')),
        recursos: {
          create: recursos.map((nombre, orden) => ({
            uri: `/api/archivos/publicos/${nombre}`,
            tipo: 'IMAGEN' as const,
            orden
          }))
        }
      },
      include: incluir
    });
    return c.json({ evento }, 201);
  }
);

app.put(
  '/eventos/:id',
  RequerirOrganizadorAprobado,
  bodyLimitado(26, 'MB'),
  ArchivosPublicos(['jpg', 'jpeg', 'png', 'webp'], 5, 5),
  async c => {
    const recursos = c.get('recursos');
    if (recursos.length > 5) {
      await borrar_publicos(recursos);
      throw new BadRequestError('Podés agregar hasta cinco imágenes por operación.');
    }
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Identificador inválido.');
    const actual = await prisma.evento.findFirst({ where: { id, id_organizador: idOrganizador(c.get('sesion')) }, select: { id: true, estado: true } });
    if (!actual) throw new NotFoundError('No se encontró el evento.');
    if (!['BORRADOR', 'RECHAZADO'].includes(actual.estado)) {
      throw new ForbiddenError('Solo podés editar borradores o eventos rechazados.');
    }
    const datos = validarDatos(transformarBody(await c.req.parseBody({ all: true })));
    await verificarCategoria(datos.id_categoria);
    const evento = await prisma.evento.update({
      where: { id },
      data: {
        ...datos,
        recursos: {
          create: recursos.map((nombre, indice) => ({
            uri: `/api/archivos/publicos/${nombre}`,
            tipo: 'IMAGEN' as const,
            orden: Date.now() + indice
          }))
        }
      },
      include: incluir
    });
    return c.json({ evento });
  }
);

export { app as EventosRoute };
