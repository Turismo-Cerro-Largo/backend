import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { ArchivosPublicos, borrar_publicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { responderIconoLocalidad } from "../shared/localidad-icono.js";

const app = new Hono();
app.use("*", RequerirAdministrador);

const formulario = z.object({
    slug: z.string().trim().min(2).max(120).regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/),
    nombre: z.string().trim().min(2).max(120),
    descripcion: z.string().trim().max(500).default(""),
    latitud: z.string().trim().default(""),
    longitud: z.string().trim().default(""),
    estado: z.enum(["PUBLICADO", "OCULTADO"]).default("PUBLICADO"),
    quitar_icono: z.enum(["true", "false"]).default("false")
});

function datos(body: Record<string, unknown>) {
    const parsed = formulario.safeParse(body);
    if (!parsed.success) throw new BadRequestError("Revisá el nombre, slug y demás datos de la localidad.");
    const { latitud, longitud, quitar_icono, ...campos } = parsed.data;
    if (Boolean(latitud) !== Boolean(longitud)) throw new BadRequestError("Completá ambas coordenadas o dejá ambas vacías.");
    const lat = latitud ? Number(latitud) : null;
    const lon = longitud ? Number(longitud) : null;
    if ((lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
        (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180)))
        throw new BadRequestError("Las coordenadas no son válidas.");
    return { ...campos, descripcion: campos.descripcion || null, latitud: lat, longitud: lon, quitar_icono: quitar_icono === "true" };
}
const idNumero = (valor: string) => {
    const id = Number(valor);
    if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();
    return id;
};
const esDuplicado = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
const serializar = (localidad: { id: number; slug: string; nombre: string; descripcion: string | null; latitud: unknown; longitud: unknown; icono: string | null; estado: string }) => ({
    ...localidad,
    latitud: localidad.latitud === null ? null : Number(localidad.latitud),
    longitud: localidad.longitud === null ? null : Number(localidad.longitud),
    icono: localidad.icono ? "/api/admin/localidades/" + localidad.id + "/icono" : null
});

app.get("/", async (c) => {
    const localidades = await prisma.localidad.findMany({ orderBy: [{ nombre: "asc" }, { id: "asc" }] });
    return c.json(localidades.map(serializar));
});

app.get("/:id/icono", async (c) => {
    const localidad = await prisma.localidad.findUnique({ where: { id: idNumero(c.req.param("id")) }, select: { icono: true } });
    if (!localidad) throw new NotFoundError();
    return responderIconoLocalidad(localidad.icono);
});

app.post("/", bodyLimitado(3, "MB"), ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 2, 1), async (c) => {
    const entrada = datos(await c.req.parseBody({ all: true }));
    const { quitar_icono: _quitar, ...campos } = entrada;
    const icono = c.get("recursos")[0] ?? null;
    try {
        const localidad = await prisma.localidad.create({ data: { ...campos, icono } });
        return c.json(serializar(localidad), 201);
    } catch (error) {
        if (esDuplicado(error)) throw new ConflictError("El nombre o el slug ya existe.");
        throw error;
    }
});

app.put("/:id", bodyLimitado(3, "MB"), ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 2, 1), async (c) => {
    const id = idNumero(c.req.param("id"));
    const anterior = await prisma.localidad.findUnique({ where: { id } });
    if (!anterior) throw new NotFoundError();
    const entrada = datos(await c.req.parseBody({ all: true }));
    const { quitar_icono, ...campos } = entrada;
    const nuevoIcono = c.get("recursos")[0];
    if (quitar_icono && nuevoIcono) throw new BadRequestError("Elegí entre quitar o reemplazar el icono.");
    try {
        const localidad = await prisma.$transaction(async (tx) => {
            const actualizado = await tx.localidad.update({
                where: { id },
                data: { ...campos, icono: nuevoIcono ?? (quitar_icono ? null : anterior.icono) }
            });
            if (anterior.nombre !== campos.nombre) {
                await tx.ubicacion.updateMany({ where: { localidad: anterior.nombre }, data: { localidad: campos.nombre } });
                await tx.usuario.updateMany({ where: { localidad: anterior.nombre }, data: { localidad: campos.nombre } });
            }
            return actualizado;
        });
        if (anterior.icono && anterior.icono !== localidad.icono) await borrar_publicos([anterior.icono]);
        return c.json(serializar(localidad));
    } catch (error) {
        if (esDuplicado(error)) throw new ConflictError("El nombre o el slug ya existe.");
        throw error;
    }
});

app.delete("/:id", async (c) => {
    const id = idNumero(c.req.param("id"));
    const localidad = await prisma.localidad.findUnique({ where: { id } });
    if (!localidad) throw new NotFoundError();
    const [lugares, usuarios] = await Promise.all([
        prisma.ubicacion.count({ where: { localidad: localidad.nombre } }),
        prisma.usuario.count({ where: { localidad: localidad.nombre } })
    ]);
    if (lugares || usuarios) throw new ConflictError("Esta localidad está en uso. Podés ocultarla.");
    await prisma.localidad.delete({ where: { id } });
    if (localidad.icono) await borrar_publicos([localidad.icono]);
    return c.body(null, 204);
});

export { app as AdminLocalidadesRoute };