// Backend: src/app/organizador/eventos.ts
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} from '../../configuracion/AppError.js';
import { prisma } from '../../configuracion/db.js';
import { bodyLimitado } from '../../middleware/Limit.js';
import { VerificarSessionRol } from '../../middleware/Session.js';

const app = new Hono();
const SOLO_ORGANIZADOR = VerificarSessionRol(['ORGANIZADOR']);
const CARPETA_IMAGENES = path.join(process.cwd(), 'publico', 'eventos');
const TIPOS = {
  'image/jpeg': { extension: '.jpg', contentType: 'image/jpeg' },
  'image/png': { extension: '.png', contentType: 'image/png' },
  'image/webp': { extension: '.webp', contentType: 'image/webp' }
} as const;
const LIMITE_ARCHIVO = 5 * 1024 * 1024;
const LIMITE_CANTIDAD = 5;

// Los datos se reciben como multipart/form-data, incluidos los eventos sin fotos.
const formulario = z.object({
  titulo: z.string().trim().min(2).max(180),
  descripcion: z.string().trim().min(5).max(5000),
  inicio: z.string().refine(s => !Number.isNaN(Date.parse(s)), 'Fecha inválida'),
  fin: z.string().optional().default(''),
  id_categoria: z.coerce.number().int().positive(),
  localidad: z.string().trim().max(120).default(''),
  direccion: z.string().trim().max(150).default(''),
  latitud: z.string().default(''),
  longitud: z.string().default(''),
  es_gratuito: z.enum(['true', 'false']),
  precio: z.string().default(''),
  telefono: z.string().trim().max(30).default(''),
  correo: z.union([z.literal(''), z.email()]).default(''),
  redes: z.string().trim().max(80).default(''),
  accion: z.enum(['borrador', 'revision'])
});

type Datos = z.infer<typeof formulario>;

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

function archivosDelBody(body: Record<string, unknown>): File[] {
  const dato = body.recursos;
  if (dato === undefined) return [];
  const valores = Array.isArray(dato) ? dato : [dato];
  if (valores.some(valor => !(valor instanceof File))) {
    throw new BadRequestError('Seleccioná archivos de imagen válidos.');
  }
  if (valores.length > LIMITE_CANTIDAD) {
    throw new BadRequestError('Podés agregar hasta cinco imágenes por operación.');
  }
  return valores as File[];
}

function contenidoValido(tipo: string, contenido: Buffer) {
  if (tipo === 'image/jpeg') return contenido.length >= 3 && contenido[0] === 255 && contenido[1] === 216 && contenido[2] === 255;
  if (tipo === 'image/png') return contenido.length >= 8 && contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (tipo === 'image/webp') return contenido.length >= 12 && contenido.toString('ascii', 0, 4) === 'RIFF' && contenido.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

async function guardarImagenes(archivos: File[]) {
  if (archivos.length === 0) return [] as string[];
  const preparados: { nombre: string; contenido: Buffer }[] = [];
  for (const archivo of archivos) {
    const tipo = TIPOS[archivo.type as keyof typeof TIPOS];
    if (!tipo || archivo.size < 1 || archivo.size > LIMITE_ARCHIVO) {
      throw new BadRequestError('Cada imagen debe ser JPG, PNG o WebP, de hasta 5 MB.');
    }
    const contenido = Buffer.from(await archivo.arrayBuffer());
    if (!contenidoValido(archivo.type, contenido)) {
      throw new BadRequestError('El contenido del archivo no corresponde a una imagen válida.');
    }
    preparados.push({ nombre: `${randomUUID()}${tipo.extension}`, contenido });
  }
  await mkdir(CARPETA_IMAGENES, { recursive: true });
  const guardados: string[] = [];
  try {
    for (const item of preparados) {
      await writeFile(path.join(CARPETA_IMAGENES, item.nombre), item.contenido, { flag: 'wx' });
      guardados.push(item.nombre);
    }
    return guardados;
  } catch (error) {
    await limpiarImagenes(guardados);
    throw error;
  }
}

async function limpiarImagenes(nombres: string[]) {
  await Promise.all(nombres.map(nombre => unlink(path.join(CARPETA_IMAGENES, nombre)).catch(() => undefined)));
}

function transformarBody(body: Record<string, unknown>) {
  const objeto: Record<string, string> = {};
  for (const nombre of ['titulo', 'descripcion', 'inicio', 'fin', 'id_categoria', 'localidad', 'direccion', 'latitud', 'longitud', 'es_gratuito', 'precio', 'telefono', 'correo', 'redes', 'accion']) {
    const valor = body[nombre];
    if (typeof valor === 'string') objeto[nombre] = valor;
  }
  const parsed = formulario.safeParse(objeto);
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

// Imágenes públicas del evento; los nombres son UUID y se valida estrictamente la ruta.
app.get('/eventos/media/:nombre', async c => {
  const nombre = c.req.param('nombre');
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) throw new NotFoundError();
  const recurso = await prisma.recurso.findFirst({ where: { uri: `/api/organizador/eventos/media/${nombre}`, tipo: 'IMAGEN', id_evento: { not: null } }, select: { id: true } });
  if (!recurso) throw new NotFoundError();
  try {
    const bytes = await readFile(path.join(CARPETA_IMAGENES, nombre));
    const tipo = nombre.endsWith('.png') ? 'image/png' : nombre.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch { throw new NotFoundError('Imagen no encontrada.'); }
});

app.get('/eventos/categorias', SOLO_ORGANIZADOR, async c => {
  const categorias = await prisma.categoria.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
  return c.json({ categorias });
});

app.get('/eventos', SOLO_ORGANIZADOR, async c => {
  const eventos = await prisma.evento.findMany({
    where: { id_organizador: idOrganizador(c.get('sesion')) },
    include: incluir,
    orderBy: { creado_en: 'desc' }
  });
  return c.json({ eventos });
});

app.get('/eventos/:id', SOLO_ORGANIZADOR, async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Identificador inválido.');
  const evento = await prisma.evento.findFirst({ where: { id, id_organizador: idOrganizador(c.get('sesion')) }, include: incluir });
  if (!evento) throw new NotFoundError('No se encontró el evento.');
  return c.json({ evento });
});

app.post('/eventos', SOLO_ORGANIZADOR, bodyLimitado(26, 'MB'), async c => {
  const body = await c.req.parseBody({ all: true });
  const datos = validarDatos(transformarBody(body));
  await verificarCategoria(datos.id_categoria);
  const archivos = archivosDelBody(body);
  const nombres = await guardarImagenes(archivos);
  try {
    const evento = await prisma.evento.create({
      data: {
        ...datos,
        id_organizador: idOrganizador(c.get('sesion')),
        recursos: {
          create: nombres.map((nombre, orden) => ({
            uri: `/api/organizador/eventos/media/${nombre}`,
            tipo: 'IMAGEN' as const,
            orden
          }))
        }
      },
      include: incluir
    });
    return c.json({ evento }, 201);
  } catch (error) {
    await limpiarImagenes(nombres);
    throw error;
  }
});

app.put('/eventos/:id', SOLO_ORGANIZADOR, bodyLimitado(26, 'MB'), async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Identificador inválido.');
  const actual = await prisma.evento.findFirst({ where: { id, id_organizador: idOrganizador(c.get('sesion')) }, select: { id: true, estado: true } });
  if (!actual) throw new NotFoundError('No se encontró el evento.');
  if (!['BORRADOR', 'RECHAZADO'].includes(actual.estado)) {
    throw new ForbiddenError('Solo podés editar borradores o eventos rechazados.');
  }
  const body = await c.req.parseBody({ all: true });
  const datos = validarDatos(transformarBody(body));
  await verificarCategoria(datos.id_categoria);
  const archivos = archivosDelBody(body);
  const nombres = await guardarImagenes(archivos);
  try {
    const evento = await prisma.evento.update({
      where: { id },
      data: {
        ...datos,
        recursos: { create: nombres.map((nombre, indice) => ({
          uri: `/api/organizador/eventos/media/${nombre}`,
          tipo: 'IMAGEN' as const,
          orden: Date.now() + indice
        })) }
      },
      include: incluir
    });
    return c.json({ evento });
  } catch (error) {
    await limpiarImagenes(nombres);
    throw error;
  }
});

export { app as EventosRoute };
