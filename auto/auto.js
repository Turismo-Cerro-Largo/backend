import { hash } from "@node-rs/argon2";
import { prisma } from "./../src/configuracion/db.js";

(async () => {
    await prisma.usuario.create({
        data: {
            nombres: "usuario",
            apellidos: "usuario",
            email: "usuario@gmail.com",
            passhash: await hash("Usuario", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
            rol: "TURISTA"
        }
    })

    await prisma.usuario.create({
        data: {
            nombres: "admin",
            apellidos: "admin",
            email: "admin@gmail.com",
            passhash: await hash("Admin", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
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
            passhash: await hash("Organizador", { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
            estado: "APROBADO"
        }
    })
})().finally(() => prisma.$disconnect())