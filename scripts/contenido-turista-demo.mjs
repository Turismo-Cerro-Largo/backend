// Ejecutar desde backend: node scripts/contenido-turista-demo.mjs
// Exclusivamente para la base local de pruebas; requiere npm run build.
import { prisma } from '../dist/configuracion/db.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
if (!/^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || '')) throw new Error('Se requiere una base aislada cerrolargo_turista_test_*.');
const medios = [
  ['Parque de prueba', 'parque.jpg', 'https://images.pexels.com/photos/27251806/pexels-photo-27251806.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Sendero arbolado · Imagen ilustrativa, Masood Aslami / Pexels'],
  ['Museo de prueba', 'museo.jpg', 'https://images.pexels.com/photos/26424630/pexels-photo-26424630.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Galería de arte · Imagen ilustrativa, Laura Paredis / Pexels'],
  ['Restaurante de prueba', 'restaurante.jpg', 'https://images.pexels.com/photos/12919407/pexels-photo-12919407.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Salón de restaurante · Imagen ilustrativa, Rene Terp / Pexels'],
  ['Parque de prueba', 'parque.mp4', 'https://videos.pexels.com/video-files/4359494/4359494-hd_1920_1080_30fps.mp4', 'Paseo por un parque · Video ilustrativo, 宋 小天 / Pexels'],
  ['Museo de prueba', 'museo.mp4', 'https://videos.pexels.com/video-files/5824200/5824200-hd_1920_1080_24fps.mp4', 'Recorrido por una galería · Video ilustrativo, Charlotte May / Pexels'],
  ['Restaurante de prueba', 'restaurante.mp4', 'https://videos.pexels.com/video-files/1858094/1858094-hd_1080_1920_30fps.mp4', 'Preparación en restaurante · Video ilustrativo, Rene Terp / Pexels'],
];
async function descargar(nombre, url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!r.ok || !/^(image|video)\//.test(r.headers.get('content-type') || '')) throw new Error(`No se pudo descargar ${nombre}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > 30_000_000) throw new Error('Archivo demasiado grande');
  await writeFile(`publico/demo/${nombre}`, bytes);
}
async function recurso(where, data) {
  const existente = await prisma.recurso.findFirst({ where });
  if (existente) await prisma.recurso.update({ where: { id: existente.id }, data });
  else await prisma.recurso.create({ data });
}
try {
  await mkdir('publico/demo', { recursive: true });
  for (const [nombre, archivo, url, descripcion] of medios) {
    const lugar = await prisma.ubicacion.findFirst({ where: { nombre, descripcion: { startsWith: 'Registro ficticio' } } });
    if (!lugar) throw new Error(`No existe el lugar de prueba ${nombre}`);
    await descargar(archivo, url);
    const uri = `/publico/demo/${archivo}`;
    await recurso({ uri, id_ubicacion: lugar.id }, { uri, id_ubicacion: lugar.id, tipo: archivo.endsWith('.mp4') ? 'VIDEO' : 'IMAGEN', descripcion, orden: archivo.endsWith('.mp4') ? 1 : 0 });
  }
  const cat = await prisma.categoria.upsert({ where: { nombre: 'Eventos' }, update: {}, create: { nombre: 'Eventos' } });
  const organizador = await prisma.organizador.upsert({ where: { email: 'agenda-demo@example.invalid' }, update: {}, create: { email: 'agenda-demo@example.invalid', nombre_organizacion: 'Agenda local de pruebas (no es el organizador real)', rut_ruc: 'DEMO-AGENDA-TURISTA', telefono: 'No disponible', passhash: randomBytes(48).toString('hex') } });
  const eventos = [
    { titulo: '22.º Mega Show Internacional de Moto', inicio: new Date('2026-11-12T00:00:00-03:00'), fin: new Date('2026-11-15T23:59:59-03:00'), lugar_evento: 'Parque Rivera, Melo, Cerro Largo, Uruguay', descripcion: 'Encuentro de motos y 4.º encuentro de motorhomes, del 12 al 15 de noviembre de 2026. El afiche anuncia espectáculos musicales, acrobacias, test ride, gastronomía, artesanías y camping. Organiza: Grupo Motomaníacos. Horarios y precio de entrada a confirmar. Registro cargado en el entorno de pruebas a partir del afiche del inicio; confirmar novedades con la organización antes de viajar.', imagen: 'fjw1jn.jpg' },
    { titulo: 'Lanzamiento de Semana de Melo 2026', inicio: new Date('2026-09-03T11:00:00-03:00'), fin: null, lugar_evento: 'Sala de Cultura, Muniz 580, Melo, Cerro Largo, Uruguay', descripcion: 'Conferencia de prensa de lanzamiento de Semana de Melo 2026. El afiche indica jueves 3 de septiembre a las 11:00, Sala de Cultura, Muniz 580. Es el lanzamiento, no las fechas de la Semana de Melo. Actividad pasada conservada para consultar el calendario. Información transcrita del afiche del inicio en el entorno de pruebas.', imagen: 'dittyx.jpg' },
  ];
  for (const { imagen, ...datos } of eventos) {
    await descargar(imagen, `https://files.catbox.moe/${imagen}`);
    const existente = await prisma.evento.findFirst({ where: { titulo: datos.titulo, id_organizador: organizador.id } });
    const data = { ...datos, estado: 'PUBLICADO', id_organizador: organizador.id, id_categoria: cat.id, es_gratuito: false, precio: null };
    const e = existente ? await prisma.evento.update({ where: { id: existente.id }, data }) : await prisma.evento.create({ data });
    const uri = `/publico/demo/${imagen}`;
    await recurso({ uri, id_evento: e.id }, { uri, id_evento: e.id, tipo: 'IMAGEN', descripcion: 'Afiche informativo previamente utilizado en el inicio. Derechos de sus respectivos autores.', orden: 0 });
    console.log(`Evento: ${e.id} ${e.titulo}`);
  }
  console.log('Tres lugares con foto y video; dos eventos con fecha. No se alteró turismo.');
} finally { await prisma.$disconnect(); }
