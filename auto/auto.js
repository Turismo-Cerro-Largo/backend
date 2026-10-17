// auto/auto.js

import { hash } from '@node-rs/argon2';
import { prisma } from './../src/configuracion/db.js';

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

  // CREAR CATEGORÍAS
  for (const [nombre, descripcion] of categorias) {
    const existe = await prisma.categoria.findFirst({
      where: { nombre }
    });

    if (!existe) {
      await prisma.categoria.create({
        data: { nombre, descripcion }
      });
    }
  }

  // CREAR USUARIOS
  for (const { password, ...datos } of usuarios) {
    const existe = await prisma.usuario.findFirst({
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

  // CREAR ORGANIZADORES
  for (const { password, ...datos } of organizadores) {
    const existe = await prisma.organizador.findFirst({
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
