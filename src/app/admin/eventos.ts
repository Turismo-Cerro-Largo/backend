// src/app/admin/eventos.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import type { EstadoEvento } from "../../configuracion/generated/prisma/enums.js";

const app = new Hono();
app.use("*", RequerirAdministrador);

const estados = [
    "BORRADOR",
    "PENDIENTE_REVISION",
    "PUBLICADO",
    "RECHAZADO",
    "CANCELADO",
    "FINALIZADO",
];

const idValido = (valor: string) => {
    const n = Number(valor);
    if (!Number.isSafeInteger(n) || n < 1) throw new BadRequestError();
    return n;
};

const pagina = (s: string | undefined, defecto: number, maximo: number) => {
    const n = s === undefined ? defecto : Number(s);
    if (!Number.isSafeInteger(n) || n < 0 || n > maximo) throw new BadRequestError();
    return n;
};

// GET /api/admin/eventos
// Listado paginado con búsqueda y filtro por estado.
app.get("/", async (c) => {
    const estado = c.req.query("estado");
    if (estado && !estados.includes(estado)) throw new BadRequestError();

    const buscar = (c.req.query("buscar") ?? "").trim();
    if (buscar.length > 120) throw new BadRequestError();

    const offset = pagina(c.req.query("offset"), 0, 1000000);
    const limit = Math.max(1, pagina(c.req.query("limit"), 12, 50));

    const where = {
        ...(estado ? { estado: estado as EstadoEvento } : {}),
        ...(buscar
            ? {
                  OR: [
                      { titulo: { contains: buscar } },
                      { descripcion: { contains: buscar } },
                  ],
              }
            : {}),
    };

    const [total, eventos, pendientes] = await Promise.all([
        prisma.evento.count({ where }),
        prisma.evento.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { creado_en: "desc" },
            select: {
                id: true,
                titulo: true,
                estado: true,
                inicio: true,
                creado_en: true,
                lugar_evento: true,
                categoria: { select: { nombre: true } },
                organizador: { select: { id: true, nombre_organizacion: true } },
                recursos: {
                    select: { uri: true, tipo: true },
                    take: 1,
                    orderBy: { orden: "asc" },
                },
            },
        }),
        prisma.evento.count({ where: { estado: "PENDIENTE_REVISION" } }),
    ]);

    return c.json({ eventos, total, pendientes, offset, limit });
});

// GET /api/admin/eventos/calendario?mes=2026-10
// Admite los filtros opcionales ?estado=PUBLICADO&buscar=feria.
// No altera los eventos: solamente devuelve los del mes solicitado.
app.get("/calendario", async (c) => {
    const mes = (c.req.query("mes") ?? "").trim();
    const estado = c.req.query("estado");
    const buscar = (c.req.query("buscar") ?? "").trim();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
        throw new BadRequestError();
    }
    if (estado && !estados.includes(estado)) throw new BadRequestError();
    if (buscar.length > 120) throw new BadRequestError();

    const [anio, numeroMes] = mes.split("-").map(Number);

    // Uruguay usa UTC-3. Se interpretan los límites del mes en hora uruguaya.
    // Se asume que los DateTime de Prisma representan instantes UTC.
    const desde = new Date(Date.UTC(anio, numeroMes - 1, 1, 3));
    const hasta = new Date(Date.UTC(anio, numeroMes, 1, 3));

    const where = {
        inicio: { gte: desde, lt: hasta },
        ...(estado ? { estado: estado as EstadoEvento } : {}),
        ...(buscar
            ? {
                  OR: [
                      { titulo: { contains: buscar } },
                      { descripcion: { contains: buscar } },
                  ],
              }
            : {}),
    };

    const eventos = await prisma.evento.findMany({
        where,
        orderBy: { inicio: "asc" },
        select: {
            id: true,
            titulo: true,
            estado: true,
            inicio: true,
            creado_en: true,
            lugar_evento: true,
            categoria: { select: { nombre: true } },
            organizador: { select: { id: true, nombre_organizacion: true } },
        },
    });

    return c.json({ mes, total: eventos.length, eventos });
});

// GET /api/admin/eventos/:id
// Consultar el detalle de un evento por su ID numérico.
app.get("/:id", async (c) => {
    const evento = await prisma.evento.findUnique({
        where: { id: idValido(c.req.param("id")) },
        include: {
            categoria: true,
            organizador: {
                select: { id: true, nombre_organizacion: true, rut_ruc: true },
            },
            recursos: {
                select: { uri: true, tipo: true, orden: true },
                orderBy: { orden: "asc" },
            },
        },
    });

    if (!evento) throw new NotFoundError();

    return c.json({
        ...evento,
        organizador: evento.organizador
            ? {
                  id: evento.organizador.id,
                  nombre_organizacion: evento.organizador.nombre_organizacion,
                  rut: evento.organizador.rut_ruc,
              }
            : null,
    });
});

export { app as AdminEventosRoute };
