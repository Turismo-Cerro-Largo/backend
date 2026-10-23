import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { NotFoundError } from "../../configuracion/AppError.js";
import { responderIconoLocalidad } from "../shared/localidad-icono.js";

const app = new Hono();

app.get("/", async (c) => {
    const localidades = await prisma.localidad.findMany({
        where: { estado: "PUBLICADO" },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        select: { id: true, slug: true, nombre: true, descripcion: true, latitud: true, longitud: true, icono: true }
    });
    return c.json(localidades.map((localidad) => ({
        id: localidad.id,
        slug: localidad.slug,
        nombre: localidad.nombre,
        descripcion: localidad.descripcion,
        latitud: localidad.latitud === null ? null : Number(localidad.latitud),
        longitud: localidad.longitud === null ? null : Number(localidad.longitud),
        icono: localidad.icono ? "/api/localidades/" + encodeURIComponent(localidad.slug) + "/icono" : null
    })));
});

app.get("/:slug/icono", async (c) => {
    const localidad = await prisma.localidad.findUnique({
        where: { slug: c.req.param("slug") },
        select: { estado: true, icono: true }
    });
    if (localidad?.estado !== "PUBLICADO") throw new NotFoundError();
    return responderIconoLocalidad(localidad.icono);
});

export { app as LocalidadesRoute };