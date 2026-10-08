import { prisma } from "../src/configuracion/db.js";
import { env } from "../src/configuracion/env.js";

type Columna = {
    tabla: string;
    columna: string;
    tipo: string;
};

const requeridas: Record<string, string[]> = {
    usuario: ["id", "nombres", "apellidos", "email", "passhash", "rol"],
    organizador: [
        "id", "nombre_organizacion", "rut_ruc", "departamento",
        "email", "telefono", "passhash", "estado"
    ],
    documento_organizador: ["id", "uri", "tipo", "id_organizador"]
};

async function revisar() {
    const columnas = await prisma.$queryRaw<Columna[]>`
        SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna, COLUMN_TYPE AS tipo
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ${env.DATABASE_NAME}
          AND TABLE_NAME IN ('usuario', 'organizador', 'documento_organizador')
    `;

    const existentes = new Map(
        columnas.map((item) => [`${item.tabla}.${item.columna}`, item.tipo])
    );
    const problemas: string[] = [];

    for (const [tabla, campos] of Object.entries(requeridas)) {
        for (const campo of campos) {
            if (!existentes.has(`${tabla}.${campo}`)) {
                problemas.push(`Falta ${tabla}.${campo}`);
            }
        }
    }

    const rol = existentes.get("usuario.rol") ?? "";
    if (rol && (!rol.includes("'TURISTA'") || !rol.includes("'ADMINISTRADOR'"))) {
        problemas.push("usuario.rol debe aceptar TURISTA y ADMINISTRADOR");
    }

    const estado = existentes.get("organizador.estado") ?? "";
    if (estado && (!estado.includes("'PENDIENTE_REVISION'") || !estado.includes("'APROBADO'"))) {
        problemas.push("organizador.estado tiene valores diferentes al esquema Prisma");
    }

    if (problemas.length) {
        console.error("La base no coincide con el registro del proyecto:");
        for (const problema of problemas) console.error(" - " + problema);
        console.error("\nNo ejecutes migrate reset ni borres tablas.");
        console.error("Hacé un respaldo antes de corregir la estructura.");
        process.exitCode = 1;
        return;
    }

    const [turistas, administradores, organizadores] = await Promise.all([
        prisma.usuario.count({ where: { rol: "TURISTA" } }),
        prisma.usuario.count({ where: { rol: "ADMINISTRADOR" } }),
        prisma.organizador.count()
    ]);

    console.log("Conexión y tablas del registro: OK");
    console.log("Turistas:", turistas);
    console.log("Administradores:", administradores);
    console.log("Organizadores:", organizadores);
    console.log("No se modificaron datos.");
}

revisar()
    .catch((error: unknown) => {
        console.error("No se pudo revisar MySQL:", error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
