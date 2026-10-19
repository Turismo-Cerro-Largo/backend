
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";

const app = new Hono();

// Consultar lugares publicados de una categoría
app.get("/", async (c) => {
    const categoria = c.req.query("categoria")?.trim();

    if (!categoria || categoria.length > 100) {
        return c.json(
            { error: "Debés indicar una categoría" },
            400
        );
    }

    const ubicaciones = await prisma.ubicacion.findMany({
        where: {
            estado: "PUBLICADO",
            categoria: {
                is: {
                    nombre: categoria
                }
            }
        },
        select: {
            id: true,
            nombre: true,
            descripcion: true,
            localidad: true,
            direccion: true,
            telefono: true,
            sitio_web: true,
            horario: true,
            latitud: true,
            longitud: true,
            recursos: {
                where: {
                    tipo: "IMAGEN"
                },
                orderBy: {
                    orden: "asc"
                },
                take: 1,
                select: {
                    id: true
                }
            }
        },
        orderBy: {
            nombre: "asc"
        }
    });

    const resultado = ubicaciones.map(
        ({ recursos, latitud, longitud, ...lugar }) => ({
            ...lugar,
            latitud: Number(latitud),
            longitud: Number(longitud),
            imagen: recursos[0] ? `/api/recursos/${recursos[0].id}` : null
        })
    );

    return c.json(resultado);
});

export { app as UbicacionesRoute };
