// Carga inicial de las cinco categorías de Turismo Cerro Largo 360.
// Ejecutar desde la raíz del backend: npx tsx prisma/seed-categorias.ts
// No borra categorías existentes ni modifica sus datos.

import { prisma } from "../src/configuracion/db.js";

const categorias = [
  {
    nombre: "Alojamiento",
    descripcion: "Hoteles, posadas, hostales y otras opciones para hospedarse."
  },
  {
    nombre: "Restaurantes",
    descripcion: "Restaurantes, cafeterías y propuestas gastronómicas."
  },
  {
    nombre: "Parques/Naturaleza",
    descripcion: "Parques, espacios naturales, paisajes y paseos al aire libre."
  },
  {
    nombre: "Cultura",
    descripcion: "Museos, patrimonio, arte y actividades culturales."
  },
  {
    nombre: "Eventos Sociales",
    descripcion: "Ferias, fiestas, encuentros y otros eventos sociales."
  }
];

async function main() {
  const resultado = await prisma.categoria.createMany({
    data: categorias,
    skipDuplicates: true
  });

  const actuales = await prisma.categoria.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" }
  });

  console.log(`Categorías nuevas creadas: ${resultado.count}`);
  console.log(`Total de categorías en MySQL: ${actuales.length}`);

  for (const categoria of actuales) {
    console.log(`${categoria.id}: ${categoria.nombre}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("Error al cargar las categorías:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
