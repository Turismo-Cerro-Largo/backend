import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { prisma } from "./src/configuracion/db.js";

async function main() {
    const host = process.env.DATABASE_HOST?.toLowerCase();

    if (
        process.env.NODE_ENV === "production" ||
        !["localhost", "127.0.0.1", "::1"].includes(host ?? "")
    ) {
        throw new Error("Este script es solo para MySQL local.");
    }

    const generarClave = () =>
        "PruebaAa" + randomBytes(8).toString("hex");

    const claveTurista = generarClave();
    const claveOrganizador = generarClave();
    const claveAdmin = generarClave();

    await prisma.usuario.upsert({
        where: { email: "turista.test.cl360@gmail.com" },
        update: {
            passhash: await hash(claveTurista),
            rol: "TURISTA"
        },
        create: {
            nombres: "Turista",
            apellidos: "Prueba",
            email: "turista.test.cl360@gmail.com",
            departamento: "Cerro Largo",
            rol: "TURISTA",
            passhash: await hash(claveTurista)
        }
    });

    await prisma.organizador.upsert({
        where: { email: "organizador.test.cl360@gmail.com" },
        update: {
            passhash: await hash(claveOrganizador),
            estado: "APROBADO"
        },
        create: {
            nombre_organizacion: "Organizador Test",
            rut_ruc: "999999999991",
            departamento: "Cerro Largo",
            email: "organizador.test.cl360@gmail.com",
            telefono: "099123456",
            passhash: await hash(claveOrganizador),
            estado: "APROBADO"
        }
    });

    await prisma.usuario.upsert({
        where: { email: "admin.test.cl360@gmail.com" },
        update: {
            passhash: await hash(claveAdmin),
            rol: "ADMINISTRADOR"
        },
        create: {
            nombres: "Administrador",
            apellidos: "Prueba",
            email: "admin.test.cl360@gmail.com",
            departamento: "Cerro Largo",
            rol: "ADMINISTRADOR",
            passhash: await hash(claveAdmin)
        }
    });

    console.log("\nCUENTAS CREADAS CORRECTAMENTE\n");
    console.log("TURISTA");
    console.log("Correo: turista.test.cl360@gmail.com");
    console.log("Clave:", claveTurista);

    console.log("\nORGANIZADOR");
    console.log("Correo: organizador.test.cl360@gmail.com");
    console.log("Clave:", claveOrganizador);

    console.log("\nADMINISTRADOR");
    console.log("Correo: admin.test.cl360@gmail.com");
    console.log("Clave:", claveAdmin);
}

main()
    .catch((error) => {
        console.error("Error al crear las cuentas:", error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
