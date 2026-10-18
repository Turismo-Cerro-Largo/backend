
// auto/auto.js

import { hash } from '@node-rs/argon2';
import { prisma } from './../src/configuracion/db.js';
import { mkdir, copyFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ========================================
// RUTAS DEL PROYECTO
// ========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const proyecto = path.resolve(__dirname, '..');
const carpetaAuto = path.join(proyecto, 'auto');
const carpetaPublicos = path.join(proyecto, 'publicos');
const carpetaPrivados = path.join(proyecto, 'privados');

// ========================================
// BUSCAR IMAGEN DF
// ========================================

// Busca automáticamente DF.png, DF.jpg,
// DF.jpeg, DF.webp o DF.avif.

async function buscarImagenDF() {
  const archivos = await readdir(carpetaAuto);

  const coincidencias = archivos.filter((archivo) =>
    /^DF\.(png|jpe?g|webp|avif)$/i.test(archivo)
  );

  if (coincidencias.length !== 1) {
    throw new Error(
      `Se esperaba exactamente una imagen DF en /auto. Encontradas: ${
        coincidencias.join(', ') || 'ninguna'
      }`
    );
  }

  return coincidencias[0];
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

async function main() {

  // ========================================
  // CATEGORÍAS
  // ========================================

  const categorias = [
    ['Alojamiento', 'Hoteles, hostales, posadas y hospedajes.'],
    ['Restaurantes', 'Restaurantes, cafeterías y gastronomía local.'],
    ['Parques/Naturaleza', 'Parques, reservas naturales y espacios al aire libre.'],
    ['Cultura', 'Museos, patrimonio histórico y actividades culturales.'],
    ['Eventos Sociales', 'Ferias, festivales, fiestas y encuentros sociales.'],
    ['Playas', 'Playas y espacios de recreación junto al agua.'],
    ['Deportes', 'Actividades y espacios deportivos.']
  ];

  // ========================================
  // USUARIOS
  // ========================================

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

  // ========================================
  // ORGANIZADORES
  // ========================================

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

  // ========================================
  // EVENTOS
  // ========================================

  const eventos = [
    {
      titulo: '38ª edición del Raid del Club Uruguay de Fraile Muerto',
      descripcion: 'Disfrutá de una jornada llena de adrenalina, cultura y diversión con una nueva edición del Raid Hípico y Baile de Raid, organizado en el Club Uruguay de Fraile Muerto, Cerro Largo.',
      inicio: '2026-11-13T16:00:00.000Z',
      fin: '2026-11-15T23:00:00.000Z',
      lugar_evento: 'Fraile Muerto, Club Uruguay',
      latitud: -32.5125066,
      longitud: -54.5233061,
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
  // UBICACIONES TURÍSTICAS
  // ========================================

  const ubicaciones = [
    {
      nombre: 'Mercado Don Francisco',
      descripcion: 'Mercado gastronómico, cultural y comercial en el antiguo Mercado Municipal de Melo. Reúne propuestas de comida, comercios y espacios de encuentro y actividades culturales en un edificio histórico renovado.',
      direccion: '18 de Julio 637, esquina José Batlle y Ordóñez, Melo, Cerro Largo, Uruguay',
      localidad: 'Melo',
      telefono: '+598 92 547 736',
      sitio_web: 'https://donfrancisco.uy/',
      horario: null,
      latitud: -32.3707081,
      longitud: -54.1680251,
      estado: 'PUBLICADO',
      categoria: 'Restaurantes',
      imagen: 'DF'
    },
      {
    nombre: 'La Rueda',
    descripcion: 'Restaurante y parrillada tradicional de Melo. Ofrece carnes a la parrilla, pastas caseras, milanesas y platos a la carta en un ambiente familiar.',
    direccion: 'General Justino Muniz 405, Melo, Cerro Largo, Uruguay',
    localidad: 'Melo',
    telefono: '+598 4642 0142',
    sitio_web: 'https://www.instagram.com/laruedamelo/',
    horario: 'Lunes cerrado; martes a sábado de 11:00 a 01:00; domingo de 11:00 a 15:30',
    latitud: -32.3741827,
    longitud: -54.1703878,
    estado: 'PUBLICADO',
    categoria: 'Restaurantes',
    imagen: 'rueda.jpg'
  },
  {
    nombre: 'Galpón de Piedra',
    descripcion: 'Restaurante y parrilla de ambiente rústico situado en Aceguá, del lado brasileño de la frontera. Ofrece buffet, carnes y platos regionales para almorzar.',
    direccion: 'Rua 512, 355, Centro, Aceguá, Rio Grande do Sul, Brasil, 96445-000',
    localidad: 'Aceguá',
    telefono: '+55 53 99946-0598',
    sitio_web: 'https://www.instagram.com/rpgalpondepiedra/',
    horario: 'Todos los días de 11:30 a 14:00',
    latitud: -34.7417797,
    longitud: -55.9229935,
    estado: 'PUBLICADO',
    categoria: 'Restaurantes',
    imagen: 'galpon.webp'
  },
{
  nombre: 'Posada San José de Lucas',
  descripcion: 'Posada rural ubicada en el entorno de Tupambaé, Cerro Largo, ideal para descansar en contacto con la naturaleza. Cuenta con jardín, piscina exterior de temporada, habitaciones con aire acondicionado, conexión Wi-Fi y estacionamiento. Dispone de opciones para familias y desayuno, según las condiciones de reserva.',
  direccion: 'Camino rural sin nombre, zona de Tupambaé, Cerro Largo, Uruguay',
  localidad: 'Tupambaé',
  telefono: '+598 91 502 405',
  sitio_web: null,
  horario: null,
  latitud: -32.8593480,
  longitud: -54.8004610,
  estado: 'PUBLICADO',
  categoria: 'Alojamiento',
  imagen: 'tupambae.jpg'
},
{
  nombre: 'Hotel Juana',
  descripcion: 'Hotel Juana de Ibarbourou, ubicado en Ruta 8 km 402, a las afueras de Melo. Ofrece habitaciones estándar, superiores y suites, piscina, restaurante, gimnasio, Wi-Fi y salón de eventos. Un entorno de parque pensado para descansar y disfrutar de la naturaleza.',
  direccion: 'Ruta 8, km 402, Melo, Cerro Largo, Uruguay',
  localidad: 'Melo',
  telefono: '+598 4642 5262',
  sitio_web: 'https://hoteljuanamelo.com/',
  horario: null,
  latitud: -32.3444395,
  longitud: -54.1677435,
  estado: 'PUBLICADO',
  categoria: 'Alojamiento',
  imagen: 'Juana.jpg'
},
{
  nombre: 'Hotel Laguna Merín',
  descripcion: 'Hotel situado en el balneario Lago Merín, en Calle 11, cerca de la laguna. Cuenta con habitaciones dobles, triples y suites, piscina climatizada, desayuno continental, Wi-Fi, restaurante, aire acondicionado y espacios para eventos. Una opción para descansar y disfrutar de la costa de Cerro Largo.',
  direccion: 'Calle 11, Lago Merín, Cerro Largo, Uruguay',
  localidad: 'Laguna Merín',
  telefono: '+598 4679 8033',
  sitio_web: 'https://hotellagunamerin.com.uy/',
  horario: null,
  latitud: -32.7449100,
  longitud: -53.2602200,
  estado: 'PUBLICADO',
  categoria: 'Alojamiento',
  imagen: 'Hotel LM.jpg'
},
{
  nombre: 'Casa Juana de Ibarbourou',
  descripcion: 'Casa Museo de Juana de Ibarbourou, ubicada en la vivienda de Melo donde la poeta uruguaya conocida como Juana de América vivió durante su infancia y juventud. Conserva muebles, fotografías, objetos personales y recuerdos vinculados a su vida y obra literaria. Es un espacio patrimonial de gran importancia para la identidad cultural de Cerro Largo.',
  direccion: 'Treinta y Tres 317, entre Manuel Oribe y Eber da Rosa, Melo, Cerro Largo, Uruguay',
  localidad: 'Melo',
  telefono: '+598 98 564 352',
  sitio_web: 'https://www.museos.gub.uy/index.php?id=745%3Acasa-museo-juana-de-ibarbourou&option=com_k2&view=item',
  horario: null,
  latitud: -32.3759500,
  longitud: -54.1677194,
  estado: 'PUBLICADO',
  categoria: 'Cultura',
  imagen: 'ibarbourou.jpg'
},
{
  nombre: 'Posta del Chuy',
  descripcion: 'Museo y Monumento Histórico Nacional ubicado a unos 13 kilómetros de Melo por Ruta 26. Construido en el siglo XIX con piedras areniscas sin argamasa, fue una posta de diligencias para viajeros entre Melo y Villa Artigas, actual Río Branco. Conserva un puente histórico sobre el arroyo Chuy del Tacuarí y elementos de la vida rural, el transporte y la cultura gaucha.',
  direccion: 'Ruta 26, aproximadamente km 13, zona rural de Melo, Cerro Largo, Uruguay',
  localidad: 'Melo',
  telefono: '+598 4642 9147',
  sitio_web: 'https://www.museos.gub.uy/index.php/museos/museos-por-localidad/cerro-largo/item/20-museo-posta-del-chuy',
  horario: 'Martes a sábado 11:00-17:00; domingo 11:00-19:00; lunes cerrado (confirmar)',
  latitud: -32.3823800,
  longitud: -54.0296400,
  estado: 'PUBLICADO',
  categoria: 'Cultura',
  imagen: 'PostaChuy.jpg'
},
{
  nombre: 'Pulpería de Ramón Mundo',
  descripcion: 'Antigua pulpería y residencia rural también conocida como Estancia Los Miradores o La Casa Quemada. Construida a mediados del siglo XIX, se destaca por sus dos torreones de vigilancia, que le daban apariencia de fortaleza. Fue propiedad de Ramón Mundo y escenario de importantes acontecimientos políticos en 1896, durante las disputas entre saravistas y municistas. Es un Monumento Histórico Nacional que conserva parte de la memoria histórica de Cerro Largo.',
  direccion: 'Estancia Los Miradores, Ruta 7 km 365, Rincón de Py, zona de Fraile Muerto, Cerro Largo, Uruguay',
  localidad: 'Fraile Muerto',
  telefono: null,
  sitio_web: 'https://destinocerrolargo.uy/la-pulperia-de-ramon-mundo-y-el-inicio-de-una-guerra-politica-y-familiar/',
  horario: null,
  latitud: -32.4679125,
  longitud: -54.4433594,
  estado: 'PUBLICADO',
  categoria: 'Cultura',
  imagen: 'JMuniz.jpg'
},

{
  nombre: 'Bio Parque',
  descripcion: 'Espacio recreativo y educativo de Melo dedicado a la flora y fauna autóctonas de Cerro Largo. Ofrece senderos, sectores verdes, juegos infantiles, áreas de descanso y observación de animales como carpinchos, zorros, ovejas, cabras, monos y aves. Forma parte del entorno del arroyo Conventos, próximo al Parque General Rivera. Ideal para pasear en familia y conocer la naturaleza de la región.',
  direccion: 'Ruta 26, Brigadier General Leandro Gómez, acceso oeste de Melo, Cerro Largo, Uruguay',
  localidad: 'Melo',
  telefono: '+598 4642 9880',
  sitio_web: 'https://destinocerrolargo.uy/bioparque/',
  horario: 'Todos los días de 07:00 a 20:00 (confirmar antes de visitar)',
  latitud: -32.3689600,
  longitud: -54.1874400,
  estado: 'PUBLICADO',
  categoria: 'Parques/Naturaleza',
  imagen: 'bioparque.jpg'
},
{
  nombre: 'Playa Fraile Muerto',
  descripcion: 'Balneario y camping municipal junto al arroyo Fraile Muerto, conocido también como La Playita. Cuenta con playa de agua dulce, monte y sombra natural, parrilleros, espacios para picnic y acampe, así como cabañas municipales. El área recreativa permite disfrutar del paisaje del arroyo y de actividades al aire libre. Se ha informado de una rampa de acceso a la playa para personas con movilidad reducida; consultar condiciones del agua y servicios antes de ingresar.',
  direccion: 'Balneario municipal de Fraile Muerto, acceso por Ruta 7, junto al arroyo Fraile Muerto, Cerro Largo, Uruguay',
  localidad: 'Fraile Muerto',
  telefono: null,
  sitio_web: 'https://www.gub.uy/ministerio-turismo/comunicacion/noticias/se-realizo-mision-tecnica-del-mintur-departamento-cerro-largo-identificando',
  horario: null,
  latitud: -32.5200625,
  longitud: -54.5275625,
  estado: 'PUBLICADO',
  categoria: 'Parques/Naturaleza',
  imagen: 'PlayaFM.jpg'
},
{
  nombre: 'Parque Rivera',
  descripcion: 'Parque General Fructuoso Rivera, uno de los principales espacios verdes de Melo, ubicado cerca del arroyo Conventos y del Bio Parque. Dispone de senderos para caminar, áreas de descanso, juegos infantiles, mesas para picnic, parrilleros y sectores deportivos. El entorno conserva referencias históricas vinculadas al general Fructuoso Rivera y es un tradicional paseo familiar de Cerro Largo.',
  direccion: 'Ruta 26, acceso oeste de Melo, junto al arroyo Conventos, Cerro Largo, Uruguay',
  localidad: 'Melo',
  telefono: null,
  sitio_web: 'https://www.gub.uy/intendencia-cerro-largo/comunicacion/noticias/intendencia-inaugura-recuperacion-espacio-parque-rivera',
  horario: 'Espacio abierto todos los días; ficha pública indica acceso las 24 horas',
  latitud: -32.3705700,
  longitud: -54.1894300,
  estado: 'PUBLICADO',
  categoria: 'Parques/Naturaleza',
  imagen: 'rivera.jpg'
}

  ];

  // ========================================
  // VALIDAR IMÁGENES
  // ========================================

  const imagenDF = await buscarImagenDF();

  const imagenes = [
    '1.png',
    '2.png',
    '3.png',
    '4.png',
    imagenDF,
  'rueda.jpg',
  'galpon.webp',
  'Hotel LM.jpg',
  'Juana.jpg',
  'tupambae.jpg',
  'JMuniz.jpg',
  'PostaChuy.jpg',
  'ibarbourou.jpg',
  'rivera.jpg',
  'PlayaFM.jpg',
  'bioparque.jpg'
  ];

  for (const imagen of imagenes) {
    await access(path.join(carpetaAuto, imagen));
  }

  // ========================================
  // CREAR CARPETAS Y COPIAR IMÁGENES
  // ========================================

  // No eliminamos publicos ni privados.
  // Así conservamos archivos subidos desde el panel.

  await mkdir(carpetaPublicos, { recursive: true });
  await mkdir(carpetaPrivados, { recursive: true });

  console.log('Carpetas publicos y privados verificadas');

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
          estado: 'PUBLICADO',
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

  // ========================================
  // CREAR UBICACIONES Y VINCULAR IMÁGENES
  // ========================================

  for (const ubicacion of ubicaciones) {

    // BUSCAR CATEGORÍA

    const categoria = await prisma.categoria.findUnique({
      where: {
        nombre: ubicacion.categoria
      }
    });

    if (!categoria) {
      throw new Error(
        `Categoría no encontrada: ${ubicacion.categoria}`
      );
    }

    // SEPARAR DATOS

    const {
      categoria: _nombreCategoria,
      imagen,
      ...datosUbicacion
    } = ubicacion;

    const nombreImagen = imagen === 'DF' ? imagenDF : imagen;

    // ========================================
    // VERIFICAR SI YA EXISTE LA UBICACIÓN
    // ========================================

    let ubicacionDB = await prisma.ubicacion.findFirst({
      where: {
        nombre: datosUbicacion.nombre,
        localidad: datosUbicacion.localidad
      }
    });

    // ========================================
    // CREAR O ACTUALIZAR UBICACIÓN
    // ========================================

    if (ubicacionDB) {

      ubicacionDB = await prisma.ubicacion.update({
        where: {
          id: ubicacionDB.id
        },
        data: {
          ...datosUbicacion,
          id_categoria: categoria.id
        }
      });

      console.log(`Ubicación actualizada: ${ubicacionDB.nombre}`);

    } else {

      ubicacionDB = await prisma.ubicacion.create({
        data: {
          ...datosUbicacion,
          id_categoria: categoria.id
        }
      });

      console.log(`Ubicación creada: ${ubicacionDB.nombre}`);
    }

    // ========================================
    // VINCULAR IMAGEN DE LA UBICACIÓN
    // ========================================

    if (nombreImagen) {

      const uri = `/api/archivos/publicos/${nombreImagen}`;

      const recursoExiste = await prisma.recurso.findFirst({
        where: {
          id_ubicacion: ubicacionDB.id,
          uri
        }
      });

      if (!recursoExiste) {

        await prisma.recurso.create({
          data: {
            uri,
            tipo: 'IMAGEN',
            descripcion: `Imagen de ${ubicacionDB.nombre}`,
            orden: 0,
            id_ubicacion: ubicacionDB.id
          }
        });

        console.log(`Imagen vinculada a la ubicación: ${uri}`);

      } else {

        console.log(
          `La imagen de la ubicación ya estaba vinculada: ${uri}`
        );
      }
    }
  }

  // ========================================
  // FINALIZACIÓN
  // ========================================

  console.log('Carga inicial finalizada correctamente');
}

// ========================================
// EJECUTAR SCRIPT
// ========================================

main()
  .catch((error) => {
    console.error('Error al cargar los datos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
