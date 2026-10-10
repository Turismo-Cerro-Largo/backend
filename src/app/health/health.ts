// src/app/health/health.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";

const app = new Hono();

app.get("/", async (c) => {
    const inicio = Date.now();

    try {
        await prisma.$transaction([
            prisma.$queryRaw`SELECT 1`,
            prisma.usuario.findFirst(),
            prisma.organizador.findFirst(),
            prisma.documentoOrganizador.findFirst(),
            prisma.categoria.findFirst(),
            prisma.ubicacion.findFirst(),
            prisma.recurso.findFirst(),
            prisma.comentario.findFirst(),
            prisma.favorito.findFirst(),
            prisma.evento.findFirst(),
            prisma.solicitudRecuperacion.findFirst(),
            prisma.empresaTransporte.findFirst(),
            prisma.horarioOmnibus.findFirst()
        ]);

        return c.json({ api: "ok", database: "ok", latencia_ms: Date.now() - inicio });
    } catch (error) {
        console.error("Health check falló:", error);
        return c.json({ api: "ok", database: "error" }, 503);
    }
});

export { app as HealthRoute };