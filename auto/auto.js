// auto/auto.js
import { hash } from "@node-rs/argon2";
import { prisma } from "./../src/configuracion/db.js";

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


(async () => {
    await prisma.usuario.create({
        data: {
            nombres: "usuario",
            apellidos: "usuario",
            email: "usuario@gmail.com",
            passhash: await hash("Usuario#123", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
            rol: "TURISTA"
        }
    })

    await prisma.usuario.create({
        data: {
            nombres: "admin",
            apellidos: "admin",
            email: "admin@gmail.com",
            passhash: await hash("Admin#12345", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
            rol: "ADMINISTRADOR"
        }
    })

    await prisma.organizador.create({
        data: {
            nombre_organizacion: "organizador",
            rut_ruc: "123456789012",
            departamento: "Cerro Largo",
            email: "organizador@gmail.com",
            telefono: "099123456",
            passhash: await hash("Organizador#123", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
            estado: "APROBADO"
        }
    })


    await prisma.categoria.createMany({
        data: categorias
    })
})().finally(() => prisma.$disconnect())