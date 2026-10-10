import { type Context, Hono } from "hono";
import { getSignedCookie } from "hono/cookie";
import { z } from "zod";
import { BadRequestError, UnauthorizedError } from "../../configuracion/AppError.js";
import { prisma } from "../../configuracion/db.js";
import { env } from "../../configuracion/env.js";
import { bodyLimitado } from "../../middleware/Limit.js";

const app = new Hono();

const departamentos = [
    "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
    "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
    "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto",
    "San José", "Soriano", "Tacuarembó", "Treinta y Tres"
] as const;

const datosPerfil = z.object({
    nombre_organizacion: z.string().trim().min(2).max(100)
        .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9][A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .,&'()/-]*$/),
    departamento: z.enum(departamentos),
    telefono: z.string().trim().min(8).max(20).regex(/^\+?[0-9 -]+$/),
    sitio_web: z.union([z.literal(""), z.string().url().max(500)])
}).strict();

const camposPerfil = {
    id: true,
    nombre_organizacion: true,
    email: true,
    rut_ruc: true,
    departamento: true,
    telefono: true,
    sitio_web: true,
    estado: true,
    creado_en: true
} as const;

async function obtenerId(c: Context) {
    const sesion = await getSignedCookie(c, env.COOKIE_SECRET, "session");
    if (!sesion) throw new UnauthorizedError();

    const [tipo, id] = sesion.split(":");
    const numero = Number(id);

    if (tipo !== "organizador" || !Number.isSafeInteger(numero) || numero < 1) {
        throw new UnauthorizedError();
    }

    return numero;
}

app.get("/perfil", async (c) => {
    const id = await obtenerId(c);

    const organizador = await prisma.organizador.findUnique({
        where: { id },
        select: camposPerfil
    });

    if (!organizador) throw new UnauthorizedError();

    return c.json(organizador);
});

app.put("/perfil", bodyLimitado(8, "KB"), async (c) => {
    const id = await obtenerId(c);
    const datos = datosPerfil.safeParse(await c.req.json().catch(() => null));

    if (!datos.success) {
        throw new BadRequestError("Revisá los datos ingresados.");
    }

    const existe = await prisma.organizador.findUnique({
        where: { id },
        select: { id: true }
    });

    if (!existe) throw new UnauthorizedError();

    const organizador = await prisma.organizador.update({
        where: { id },
        data: {
            nombre_organizacion: datos.data.nombre_organizacion,
            departamento: datos.data.departamento,
            telefono: datos.data.telefono,
            sitio_web: datos.data.sitio_web || null
        },
        select: camposPerfil
    });

    return c.json(organizador);
});

export { app as OrganizadorRoute };
