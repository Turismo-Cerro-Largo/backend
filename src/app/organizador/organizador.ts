// src/app/organizador/organizador.ts
import { Hono } from "hono";
import { BadRequestError, UnauthorizedError } from "../../configuracion/AppError.js";
import { prisma } from "../../configuracion/db.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { VerificarSessionRol } from "../../middleware/Session.js";
import { camposPerfil } from "./organizador.consts.js";
import { datosPerfil } from "./organizador.scheme.js";

const app = new Hono();

app.get("/perfil", VerificarSessionRol(["ORGANIZADOR"]), async (c) => {
    const organizador = await prisma.organizador.findUnique({
        where: { id: Number(c.get("sesion").id) },
        select: camposPerfil
    });

    if (!organizador) throw new UnauthorizedError();

    return c.json(organizador);
});

app.put("/perfil", VerificarSessionRol(["ORGANIZADOR"]), bodyLimitado(8, "KB"), async (c) => {
    const datos = datosPerfil.safeParse(await c.req.json().catch(() => null));
    if (!datos.success) {
        throw new BadRequestError("Revisá los datos ingresados.");
    }

    const existe = await prisma.organizador.findUnique({
        where: { id: Number(c.get("sesion").id) },
        select: { id: true }
    });

    if (!existe) throw new UnauthorizedError();

    const organizador = await prisma.organizador.update({
        where: { id: Number(c.get("sesion").id) },
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