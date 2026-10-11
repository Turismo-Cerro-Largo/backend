
import { prisma } from "../src/configuracion/db.js";

// Categorías de Turismo Cerro Largo 360
const categorias = [
  {
    nombre: "Alojamiento",
    descripcion: "Hoteles, hostales, posadas y hospedajes."
  },
  {
    nombre: "Restaurantes",
    descripcion: "Restaurantes, cafeterías y gastronomía local."
  },
  {
    nombre: "Parques/Naturaleza",
    descripcion: "Parques, reservas naturales y espacios al aire libre."
  },
  {
    nombre: "Cultura",
    descripcion: "Museos, patrimonio histórico y actividades culturales."
  },
  {
    nombre: "Eventos Sociales",
    descripcion: "Ferias, festivales, fiestas y encuentros sociales."
  }
];

async function main() {
  console.log("Cargando categorías...");

  const resultado = await prisma.categoria.createMany({
    data: categorias,
    skipDuplicates: true
  });

  console.log(
    `Categorías nuevas agregadas: ${resultado.count}`
  );

  const todas = await prisma.categoria.findMany({
    orderBy: {
      nombre: "asc"
    }
  });

  console.log("Categorías disponibles:");

  console.table(todas);
}

try {
  await main();
} catch (error) {
  console.error("Error al cargar categorías:", error);
  throw error;
} finally {
  await prisma.$disconnect();
}