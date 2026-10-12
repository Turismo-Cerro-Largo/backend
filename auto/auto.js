// auto/auto.js
// Datos ficticios de desarrollo para Cerro Largo 360. No crea imágenes ni videos.
import { hash } from '@node-rs/argon2';
import { copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './../src/configuracion/db.js';

// Ejecutar con `pnpm tsx auto/auto.js` desde la raíz del backend.
const carpetaAuto = path.dirname(fileURLToPath(import.meta.url));
const raizBackend = process.cwd();
const nombresImagenes = Array.from({ length: 6 }, (_, i) => `${i + 1}.jpg`);
const nombresMultimedia = [...nombresImagenes, '1.mp4'];

async function prepararMedios() {
  // Se comprueba todo ANTES de insertar datos, para no dejar un seed a medias.
  const faltantes = [];
  for (const nombre of nombresMultimedia) {
    try { await access(path.join(carpetaAuto, nombre)); }
    catch { faltantes.push(nombre); }
  }
  if (faltantes.length) throw new Error(`Faltan archivos en auto/: ${faltantes.join(', ')}. Poné 1.jpg a 6.jpg y 1.mp4 junto a auto.js.`);

  const publico = path.join(raizBackend, 'publicos', 'seed');
  const privado = path.join(raizBackend, 'privados');
  await Promise.all([mkdir(publico, { recursive: true }), mkdir(privado, { recursive: true })]);

  const urls = new Map();
  for (const nombre of nombresMultimedia) {
    // Copias determinísticas para evitar archivos duplicados al ejecutar el seed.
    await copyFile(path.join(carpetaAuto, nombre), path.join(publico, nombre));
    urls.set(nombre, `/api/archivos/publicos/seed/${nombre}`);
  }
  // Solo imágenes para documentos privados; videos NO se usan como cédulas.
  for (const nombre of nombresImagenes) {
    await copyFile(path.join(carpetaAuto, nombre), path.join(privado, `seed-cedula-${nombre}`));
  }
  return urls;
}

async function asociarRecursos({ id_ubicacion, id_evento, id_comentario }, nombres, urls) {
  for (const [orden, nombre] of nombres.entries()) {
    const uri = urls.get(nombre);
    const tipo = nombre.endsWith('.mp4') ? 'VIDEO' : 'IMAGEN';
    const where = { ...(id_ubicacion ? { id_ubicacion } : {}), ...(id_evento ? { id_evento } : {}), ...(id_comentario ? { id_comentario } : {}), uri };
    const existente = await prisma.recurso.findFirst({ where, select: { id: true } });
    if (!existente) {
      await prisma.recurso.create({ data: { ...where, tipo, orden, descripcion: 'Multimedia de prueba (seed)' } });
    }
  }
}

async function asociarCedulas(organizador, indice) {
  const frente = `seed-cedula-${nombresImagenes[(indice * 2) % nombresImagenes.length]}`;
  const dorso = `seed-cedula-${nombresImagenes[(indice * 2 + 1) % nombresImagenes.length]}`;
  for (const [tipo, uri] of [['CEDULA_FRENTE', frente], ['CEDULA_DORSO', dorso]]) {
    const existe = await prisma.documentoOrganizador.findFirst({ where: { id_organizador: organizador.id, tipo, uri } });
    if (!existe) await prisma.documentoOrganizador.create({ data: { id_organizador: organizador.id, tipo, uri } });
  }
}

const opcionesHash = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const dias = (n) => new Date(Date.now() + n * 86400000);
const hora = (h, m = 0) => new Date(`1970-01-01T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);

const categorias = [
  ['Alojamiento', 'Hoteles, hostales, posadas y hospedajes.'],
  ['Restaurantes', 'Restaurantes, cafeterías y gastronomía local.'],
  ['Parques/Naturaleza', 'Parques, reservas naturales y espacios al aire libre.'],
  ['Cultura', 'Museos, patrimonio histórico y actividades culturales.'],
  ['Eventos Sociales', 'Ferias, festivales, fiestas y encuentros sociales.'],
  ['Playas', 'Playas y espacios de recreación junto al agua.'],
  ['Deportes', 'Actividades y espacios deportivos.'],
];

const usuarios = [
  { nombres: 'usuario', apellidos: 'usuario', email: 'usuario@gmail.com', rol: 'TURISTA', password: 'Usuario#123', departamento: 'Cerro Largo', genero: 'otro' },
  { nombres: 'admin', apellidos: 'admin', email: 'admin@gmail.com', rol: 'ADMINISTRADOR', password: 'Admin#12345', departamento: 'Cerro Largo' },
  { nombres: 'Lucía', apellidos: 'Pereira', email: 'lucia.demo@example.com', rol: 'TURISTA', password: 'Demo#12345', departamento: 'Cerro Largo', genero: 'femenino' },
  { nombres: 'Mateo', apellidos: 'Silva', email: 'mateo.demo@example.com', rol: 'TURISTA', password: 'Demo#12345', departamento: 'Montevideo', genero: 'masculino' },
  { nombres: 'Camila', apellidos: 'Rodríguez', email: 'camila.demo@example.com', rol: 'TURISTA', password: 'Demo#12345', departamento: 'Treinta y Tres', genero: 'femenino' },
  { nombres: 'Santiago', apellidos: 'Gómez', email: 'santiago.demo@example.com', rol: 'TURISTA', password: 'Demo#12345', departamento: 'Cerro Largo', genero: 'masculino' },
  { nombres: 'Valentina', apellidos: 'Suárez', email: 'valentina.demo@example.com', rol: 'TURISTA', password: 'Demo#12345', departamento: 'Maldonado', genero: 'femenino' },
];

const organizadores = [
  { nombre_organizacion: 'organizador', rut_ruc: '123456789012', email: 'organizador@gmail.com', telefono: '099123456', departamento: 'Cerro Largo', estado: 'APROBADO', password: 'Organizador#123' },
  { nombre_organizacion: 'Cultura Melo Demo', rut_ruc: '219900001111', email: 'cultura.melo.demo@example.com', telefono: '099000111', departamento: 'Cerro Largo', estado: 'APROBADO', password: 'Demo#12345' },
  { nombre_organizacion: 'Turismo Laguna Demo', rut_ruc: '219900002222', email: 'laguna.demo@example.com', telefono: '099000222', departamento: 'Cerro Largo', estado: 'PENDIENTE_REVISION', password: 'Demo#12345' },
  { nombre_organizacion: 'Productores del Este Demo', rut_ruc: '219900003333', email: 'productores.demo@example.com', telefono: '099000333', departamento: 'Cerro Largo', estado: 'RECHAZADO', motivo_rechazo: 'Falta documentación para validar la organización (dato de prueba).', password: 'Demo#12345' },
];

const ubicaciones = [
  { nombre: 'Plaza Constitución Demo', descripcion: 'Espacio público en el centro de Melo, ideal para pasear.', localidad: 'Melo', direccion: 'Centro, Melo', latitud: -32.371, longitud: -54.167, cat: 'Cultura', estado: 'PUBLICADO', horario: 'Todos los días' },
  { nombre: 'Laguna Merín Demo', descripcion: 'Paisaje de laguna y playa para disfrutar en familia.', localidad: 'Laguna Merín', direccion: 'Balneario Laguna Merín', latitud: -32.740, longitud: -53.360, cat: 'Playas', estado: 'PUBLICADO', horario: 'Acceso público' },
  { nombre: 'Parque Rivera Demo', descripcion: 'Espacio verde para caminatas y actividades al aire libre.', localidad: 'Melo', direccion: 'Melo, Cerro Largo', latitud: -32.356, longitud: -54.180, cat: 'Parques/Naturaleza', estado: 'PUBLICADO' },
  { nombre: 'Restaurante Criollo Demo', descripcion: 'Propuesta gastronómica de muestra, no corresponde a un comercio real.', localidad: 'Melo', direccion: 'Melo, Cerro Largo', latitud: -32.372, longitud: -54.160, cat: 'Restaurantes', estado: 'PUBLICADO', horario: '12:00 a 23:00' },
  { nombre: 'Posada del Este Demo', descripcion: 'Alojamiento ficticio para probar las vistas de administración.', localidad: 'Río Branco', direccion: 'Río Branco, Cerro Largo', latitud: -32.600, longitud: -53.390, cat: 'Alojamiento', estado: 'OCULTADO' },
  { nombre: 'Reserva Natural Demo', descripcion: 'Lugar ficticio pendiente de publicación.', localidad: 'Fraile Muerto', direccion: 'Fraile Muerto, Cerro Largo', latitud: -32.490, longitud: -54.070, cat: 'Parques/Naturaleza', estado: 'OCULTADO' },
];

const eventos = [
  { titulo: 'Feria Gastronómica Demo', descripcion: 'Feria de ejemplo con gastronomía y emprendimientos.', cat: 'Eventos Sociales', org: 'organizador@gmail.com', lugar_evento: 'Melo', latitud: -32.371, longitud: -54.167, estado: 'PENDIENTE_REVISION', inicio: dias(12), fin: dias(13), es_gratuito: true },
  { titulo: 'Festival Cultural Demo', descripcion: 'Encuentro cultural ficticio para probar eventos publicados.', cat: 'Cultura', org: 'cultura.melo.demo@example.com', lugar_evento: 'Melo', latitud: -32.370, longitud: -54.170, estado: 'PUBLICADO', inicio: dias(25), fin: dias(25), es_gratuito: false, precio: 350 },
  { titulo: 'Caminata por la Naturaleza Demo', descripcion: 'Salida de muestra para revisar borradores.', cat: 'Parques/Naturaleza', org: 'organizador@gmail.com', lugar_evento: 'Melo', estado: 'BORRADOR', inicio: dias(40), es_gratuito: true },
  { titulo: 'Encuentro Social Demo', descripcion: 'Evento ficticio rechazado para pruebas.', cat: 'Eventos Sociales', org: 'organizador@gmail.com', lugar_evento: 'Río Branco', estado: 'RECHAZADO', motivo_rechazo: 'Faltan detalles del programa (dato de prueba).', inicio: dias(18), es_gratuito: true },
  { titulo: 'Torneo Deportivo Demo', descripcion: 'Actividad de muestra cancelada.', cat: 'Deportes', org: 'cultura.melo.demo@example.com', lugar_evento: 'Melo', estado: 'CANCELADO', inicio: dias(15), es_gratuito: true },
];

const comentarios = [
  ['Plaza Constitución Demo', 'usuario@gmail.com', 5, 'Muy lindo lugar para pasear y descansar.', 'PUBLICADO'],
  ['Plaza Constitución Demo', 'lucia.demo@example.com', 4, 'Me gustó el ambiente y la ubicación céntrica.', 'PUBLICADO'],
  ['Plaza Constitución Demo', 'mateo.demo@example.com', 3, 'Está bien, pero podría mejorar la iluminación.', 'PENDIENTE_REVISION'],
  ['Laguna Merín Demo', 'camila.demo@example.com', 5, 'Hermoso paisaje y muy buena experiencia.', 'PUBLICADO'],
  ['Laguna Merín Demo', 'santiago.demo@example.com', 2, 'El acceso necesita mejoras en algunos sectores.', 'PENDIENTE_REVISION'],
  ['Laguna Merín Demo', 'valentina.demo@example.com', 1, 'Comentario de ejemplo ocultado por moderación.', 'OCULTADO'],
  ['Parque Rivera Demo', 'lucia.demo@example.com', 4, 'Un lugar agradable para caminar.', 'PUBLICADO'],
  ['Parque Rivera Demo', 'camila.demo@example.com', 3, 'La visita fue tranquila, faltan algunos carteles.', 'PENDIENTE_REVISION'],
  ['Restaurante Criollo Demo', 'mateo.demo@example.com', 5, 'Comida excelente (reseña ficticia de prueba).', 'PUBLICADO'],
  ['Restaurante Criollo Demo', 'usuario@gmail.com', 2, 'Servicio lento en esta reseña ficticia.', 'OCULTADO'],
  ['Posada del Este Demo', 'santiago.demo@example.com', 4, 'Habitaciones cómodas, según la reseña de prueba.', 'PENDIENTE_REVISION'],
  ['Reserva Natural Demo', 'valentina.demo@example.com', 3, 'Un espacio interesante para conocer.', 'PENDIENTE_REVISION'],
];

async function main() {
  const hashes = new Map();
  async function obtenerHash(password) {
    if (!hashes.has(password)) hashes.set(password, await hash(password, opcionesHash));
    return hashes.get(password);
  }

  console.log('🌱 Cargando datos DEMO con imágenes y video...');
  const urls = await prepararMedios();
  const categoriasPorNombre = new Map();
  for (const [nombre, descripcion] of categorias) {
    // No requiere un índice único en nombre: evita duplicar por búsqueda.
    let categoria = await prisma.categoria.findFirst({ where: { nombre } });
    if (!categoria) categoria = await prisma.categoria.create({ data: { nombre, descripcion } });
    categoriasPorNombre.set(nombre, categoria);
  }

  const usuariosPorEmail = new Map();
  for (const { password, ...datos } of usuarios) {
    // Actualiza solo campos no sensibles; NO cambia claves ni roles ya existentes.
    let usuario = await prisma.usuario.findFirst({ where: { email: datos.email } });
    if (!usuario) usuario = await prisma.usuario.create({ data: { ...datos, passhash: await obtenerHash(password) } });
    usuariosPorEmail.set(datos.email, usuario);
  }

  const organizadoresPorEmail = new Map();
  for (const [indice, { password, ...datos }] of organizadores.entries()) {
    let organizador = await prisma.organizador.findFirst({ where: { email: datos.email } });
    if (!organizador) organizador = await prisma.organizador.create({ data: { ...datos, passhash: await obtenerHash(password) } });
    organizadoresPorEmail.set(datos.email, organizador);
    await asociarCedulas(organizador, indice);
  }

  const ubicacionesPorNombre = new Map();
  for (const { cat, ...datos } of ubicaciones) {
    let ubicacion = await prisma.ubicacion.findFirst({ where: { nombre: datos.nombre } });
    if (!ubicacion) ubicacion = await prisma.ubicacion.create({ data: { ...datos, id_categoria: categoriasPorNombre.get(cat).id } });
    ubicacionesPorNombre.set(datos.nombre, ubicacion);
  }

  // Galerías mixtas: fotos repetidas entre módulos a propósito, sin duplicar el archivo físico.
  for (const [indice, ubicacion] of ubicaciones.entries()) {
    await asociarRecursos({ id_ubicacion: ubicacionesPorNombre.get(ubicacion.nombre).id },
      [nombresImagenes[indice % 6], nombresImagenes[(indice + 1) % 6], ...(indice % 2 === 0 ? ['1.mp4'] : [])], urls);
  }

  for (const [indice, { cat, org, ...datos }] of eventos.entries()) {
    let evento = await prisma.evento.findFirst({ where: { titulo: datos.titulo } });
    if (!evento) evento = await prisma.evento.create({ data: { ...datos, id_categoria: categoriasPorNombre.get(cat).id, id_organizador: organizadoresPorEmail.get(org).id } });
    await asociarRecursos({ id_evento: evento.id },
      [nombresImagenes[(indice + 2) % 6], nombresImagenes[(indice + 3) % 6], ...(indice % 2 === 1 ? ['1.mp4'] : [])], urls);
  }

  for (const [nombreUbicacion, correo, calificacion, texto, estado] of comentarios) {
    const id_ubicacion = ubicacionesPorNombre.get(nombreUbicacion).id;
    const id_usuario = usuariosPorEmail.get(correo).id;
    const existe = await prisma.comentario.findFirst({ where: { id_ubicacion, id_usuario, texto } });
    const comentario = existe ?? await prisma.comentario.create({ data: { texto, calificacion, estado, id_usuario, id_ubicacion } });
    const indice = comentarios.findIndex((c) => c[0] === nombreUbicacion && c[1] === correo && c[3] === texto);
    await asociarRecursos({ id_comentario: comentario.id },
      [nombresImagenes[indice % 6], ...(indice % 3 === 0 ? [nombresImagenes[(indice + 4) % 6], '1.mp4'] : [])], urls);
  }

  const empresas = [
    { nombre: 'Transportes Demo Norte', telefono: '099111111' },
    { nombre: 'Ómnibus Demo Este', telefono: '099222222' },
  ];
  const empresasPorNombre = new Map();
  for (const datos of empresas) {
    let empresa = await prisma.empresaTransporte.findFirst({ where: { nombre: datos.nombre } });
    if (!empresa) empresa = await prisma.empresaTransporte.create({ data: datos });
    empresasPorNombre.set(datos.nombre, empresa);
  }

  const horarios = [
    ['Transportes Demo Norte', 'Melo', 'Río Branco', 7, 30, 9, 15, 'Lunes a viernes', 'DEPARTAMENTAL', 230, 'PUBLICADO'],
    ['Transportes Demo Norte', 'Melo', 'Fraile Muerto', 14, 0, 15, 10, 'Todos los días', 'DEPARTAMENTAL', 140, 'PUBLICADO'],
    ['Ómnibus Demo Este', 'Montevideo', 'Melo', 8, 0, 14, 30, 'Lunes a domingo', 'INTERDEPARTAMENTAL', 850, 'PUBLICADO'],
    ['Ómnibus Demo Este', 'Río Branco', 'Melo', 18, 0, 19, 30, 'Sábados y domingos', 'DEPARTAMENTAL', 230, 'OCULTADO'],
  ];
  for (const [empresa, origen, destino, hs, ms, hl, ml, diasServicio, tipo_servicio, precio, estado] of horarios) {
    const id_empresa = empresasPorNombre.get(empresa).id;
    const hora_salida = hora(hs, ms);
    const existe = await prisma.horarioOmnibus.findFirst({ where: { id_empresa, origen, destino, hora_salida } });
    if (!existe) await prisma.horarioOmnibus.create({ data: { id_empresa, origen, destino, hora_salida, hora_llegada: hora(hl, ml), dias: diasServicio, tipo_servicio, precio, estado } });
  }

  const conteos = await Promise.all([
    prisma.categoria.count(), prisma.usuario.count(), prisma.organizador.count(),
    prisma.ubicacion.count(), prisma.evento.count(), prisma.comentario.count(),
    prisma.empresaTransporte.count(), prisma.horarioOmnibus.count(),
  ]);
  console.log('✅ Seed terminado. Totales (incluyen registros existentes):');
  console.table(Object.fromEntries(['Categorías','Usuarios','Organizadores','Ubicaciones','Eventos','Comentarios','Empresas','Horarios'].map((k, i) => [k, conteos[i]])));
  console.log('🖼️ Archivos: publicos/seed/* y privados/seed-cedula-*.jpg');
  console.log('⚠️ Todos los lugares, comentarios, empresas y eventos identificados como Demo son ficticios.');
}

main().catch((error) => { console.error('❌ Error en seed:', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });