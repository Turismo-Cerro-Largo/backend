
// auto/auto.js

import { hash } from '@node-rs/argon2';
import { prisma } from './../src/configuracion/db.js';
import { rm, mkdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// RUTAS DEL PROYECTO
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const proyecto = path.resolve(__dirname, '..');
const carpetaAuto = path.join(proyecto, 'auto');
const carpetaPublicos = path.join(proyecto, 'publicos');
const carpetaPrivados = path.join(proyecto, 'privados');

async function main() {

  // CATEGORÍAS
  const categorias = [
    ['Alojamiento', 'Hoteles, hostales, posadas y hospedajes.'],
    ['Restaurantes', 'Restaurantes, cafeterías y gastronomía local.'],
    ['Parques/Naturaleza', 'Parques, reservas naturales y espacios al aire libre.'],
    ['Cultura', 'Museos, patrimonio histórico y actividades culturales.'],
    ['Eventos Sociales', 'Ferias, festivales, fiestas y encuentros sociales.'],
    ['Playas', 'Playas y espacios de recreación junto al agua.'],
    ['Deportes', 'Actividades y espacios deportivos.']
  ];

  // USUARIOS
  const usuarios = [
    {
      nombres: 'usuario',
      apellidos: 'usuario',
      email: 'usuario@gmail.com',
      rol: 'TURISTA',
      password: 'Usuario#123',
      departamento: 'Cerro Largo',
      genero: 'otro'
    },
    {
      nombres: 'admin',
      apellidos: 'admin',
      email: 'admin@gmail.com',
      rol: 'ADMINISTRADOR',
      password: 'Admin#12345',
      departamento: 'Cerro Largo'
    }
  ];

  // ORGANIZADORES
  const organizadores = [
    {
      nombre_organizacion: 'organizador',
      rut_ruc: '123456789012',
      email: 'organizador@gmail.com',
      telefono: '099123456',
      departamento: 'Cerro Largo',
      estado: 'APROBADO',
      password: 'Organizador#123'
    }
  ];

  // EVENTOS
  const eventos = [
    {
      titulo: '38ª edición del Raid del Club Uruguay de Fraile Muerto',
      descripcion: 'Disfrutá de una jornada llena de adrenalina, cultura y diversión con una nueva edición del Raid Hípico y Baile de Raid, organizado en el Club Uruguay de Fraile Muerto, Cerro Largo.',
      inicio: '2026-11-13T16:00:00.000Z',
      fin: '2026-11-15T23:00:00.000Z',
      lugar_evento: 'Fraile Muerto, Club Uruguay',
      latitud: -32.5125066,
      longitud: -54.5233061,
      estado: 'PUBLICADO',
      es_gratuito: true,
      precio: null,
      contacto: '098123456',
      categoria: 'Eventos Sociales',
      imagen: '1.png'
    },
    {
      titulo: 'Encuentro Futbol Sala Internacional',
      descripcion: 'Viví una jornada única con equipos internacionales de fútbol de salón, partidos de alto nivel, emoción de principio a fin y un gran ambiente para toda la familia.',
      inicio: '2026-12-04T11:00:00.000Z',
      fin: '2026-12-06T00:00:00.000Z',
      lugar_evento: 'Río Branco, Gimnasio Municipal',
      estado: 'PUBLICADO',
      latitud: -32.5980074,
      longitud: -53.3895605,
      es_gratuito: false,
      precio: 100,
      contacto: '098654987',
      categoria: 'Deportes',
      imagen: '4.png'
    },
    {
      titulo: 'Feria de Artesanos',
      descripcion: 'Este 24 de diciembre, la Plaza Independencia de Melo, Cerro Largo, se llena de creatividad, tradición y espíritu navideño con una nueva edición de la Feria del Artesano.\n\nDisfrutá de una hermosa jornada recorriendo puestos de artesanos locales, donde encontrarás productos hechos a mano, artesanías únicas, decoraciones, accesorios y regalos especiales para esta Navidad.',
      inicio: '2026-12-24T20:00:00.000Z',
      estado: 'PENDIENTE_REVISION',
      fin: '2026-12-25T00:30:00.000Z',
      lugar_evento: 'Melo, Plaza Independencia',
      latitud: -32.3681063,
      longitud: -54.1701136,
      es_gratuito: true,
      precio: null,
      contacto: null,
      categoria: 'Eventos Sociales',
      imagen: null
    },
    {
      titulo: 'Beneficio COVIMEL',
      descripcion: 'La Cooperativa de Vivienda COVIMEL invita a la comunidad a participar de una jornada solidaria que tiene como objetivo recaudar fondos para apoyar el proyecto habitacional de la cooperativa.\n\nEste evento busca fomentar la unión, la colaboración y el compromiso entre vecinos y familias, trabajando juntos para alcanzar el sueño de contar con una vivienda propia.\n\nFecha: 15 de enero de 2027.\n\n¡Tu colaboración es muy importante! Cada aporte nos acerca un paso más a cumplir nuestro objetivo.\n\nCOVIMEL: Unidos por un mismo sueño.',
      inicio: '2027-01-15T18:00:00.000Z',
      fin: '2027-01-16T01:00:00.000Z',
      estado: 'PUBLICADO',
      lugar_evento: 'Aceguá',
      latitud: -31.8709592,
      longitud: -54.1625389,
      es_gratuito: true,
      precio: null,
      contacto: '097123654',
      categoria: 'Eventos Sociales',
      imagen: '3.png'
    },
    {
      titulo: 'Noche de Jazz',
      descripcion: 'Una velada especial para disfrutar del mejor jazz al aire libre en el corazón de Melo. Música en vivo en la Plaza Constitución de Melo.',
      // Horario no indicado en el afiche.
      // Se guarda provisionalmente a las 00:00.
      inicio: '2026-12-23T00:00:00-03:00',
      estado: 'PUBLICADO',
      fin: null,
      lugar_evento: 'Plaza Constitución de Melo',
      latitud: null,
      longitud: null,
      es_gratuito: false,
      precio: null,
      contacto: null,
      categoria: 'Eventos Sociales',
      imagen: '2.png'
    }
  ];

  // ========================================
  // VALIDAR IMÁGENES
  // ========================================

  const imagenes = ['1.png', '2.png', '3.png', '4.png'];

  for (const imagen of imagenes) {
    await access(path.join(carpetaAuto, imagen));
  }

  // ========================================
  // CREAR CARPETAS Y COPIAR IMÁGENES
  // ========================================

  // ATENCIÓN: elimina todo el contenido anterior
  // de publicos y privados, incluidos otros archivos.

  await rm(carpetaPublicos, {
    recursive: true,
    force: true
  });

  await rm(carpetaPrivados, {
    recursive: true,
    force: true
  });

  await mkdir(carpetaPublicos, { recursive: true });
  await mkdir(carpetaPrivados, { recursive: true });

  console.log('Carpetas publicos y privados creadas');

  for (const imagen of imagenes) {
    const origen = path.join(carpetaAuto, imagen);
    const destino = path.join(carpetaPublicos, imagen);

    await copyFile(origen, destino);

    console.log(`Imagen copiada: ${imagen}`);
  }

  // ========================================
  // CREAR CATEGORÍAS
  // ========================================

  for (const [nombre, descripcion] of categorias) {
    await prisma.categoria.upsert({
      where: { nombre },
      update: { descripcion },
      create: { nombre, descripcion }
    });
  }

  console.log('Categorías cargadas');

  // ========================================
  // CREAR USUARIOS
  // ========================================

  for (const { password, ...datos } of usuarios) {
    const existe = await prisma.usuario.findUnique({
      where: { email: datos.email }
    });

    if (!existe) {
      await prisma.usuario.create({
        data: {
          ...datos,
          passhash: await hash(password)
        }
      });
    }
  }

  console.log('Usuarios cargados');

  // ========================================
  // CREAR ORGANIZADORES
  // ========================================

  for (const { password, ...datos } of organizadores) {
    const existe = await prisma.organizador.findUnique({
      where: { email: datos.email }
    });

    if (!existe) {
      await prisma.organizador.create({
        data: {
          ...datos,
          passhash: await hash(password)
        }
      });
    }
  }

  console.log('Organizadores cargados');

  // ========================================
  // OBTENER ORGANIZADOR
  // ========================================

  const organizador = await prisma.organizador.findUnique({
    where: {
      email: 'organizador@gmail.com'
    }
  });

  if (!organizador) {
    throw new Error('Organizador no encontrado');
  }

  // ========================================
  // CREAR EVENTOS Y VINCULAR RECURSOS
  // ========================================

  for (const evento of eventos) {

    const categoria = await prisma.categoria.findUnique({
      where: {
        nombre: evento.categoria
      }
    });

    if (!categoria) {
      throw new Error(
        `Categoría no encontrada: ${evento.categoria}`
      );
    }

    const {
      categoria: nombreCategoria,
      imagen,
      inicio,
      fin,
      ...datosEvento
    } = evento;

    let eventoDB = await prisma.evento.findFirst({
      where: {
        titulo: evento.titulo,
        id_organizador: organizador.id
      }
    });

    if (!eventoDB) {
      eventoDB = await prisma.evento.create({
        data: {
          ...datosEvento,
          inicio: new Date(inicio),
          fin: fin ? new Date(fin) : null,
          id_categoria: categoria.id,
          id_organizador: organizador.id
        }
      });

      console.log(`Evento creado: ${evento.titulo}`);
    } else {
      console.log(`Evento existente: ${evento.titulo}`);
    }

    // ========================================
    // ASOCIAR IMAGEN AL EVENTO
    // ========================================

    if (imagen) {

      const uri = `/api/archivos/publicos/${imagen}`;

      const recursoExiste = await prisma.recurso.findFirst({
        where: {
          id_evento: eventoDB.id,
          uri
        }
      });

      if (!recursoExiste) {
        await prisma.recurso.create({
          data: {
            uri,
            tipo: 'IMAGEN',
            descripcion: `Imagen de ${evento.titulo}`,
            orden: 0,
            id_evento: eventoDB.id
          }
        });

        console.log(`Recurso vinculado: ${uri}`);
      } else {
        console.log(`Recurso ya existe: ${uri}`);
      }
    }
  }

  console.log('Carga inicial finalizada correctamente');
}

main()
  .catch((error) => {
    console.error('Error al cargar los datos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
