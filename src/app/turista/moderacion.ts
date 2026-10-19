import { origenesPermitidos } from "../../middleware/Origen.js";
import { Hono } from "hono";
import { z } from "zod";
import { bodyLimit } from "hono/body-limit";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../configuracion/AppError.js";
import { VerificarSession } from "../../middleware/Session.js";
import { idValido } from "./turista.schema.js";

// Módulo acotado mientras el equipo integra la API administrativa general.
const app = new Hono<{ Variables: { sesion: { tipo: string; id: string; rol: string } } }>();
app.use("*", VerificarSession);
app.use("*", async (c, next) => {
	c.header("Cache-Control", "private, no-store");
	const sesion = c.get("sesion");
	const id = idValido(sesion.id);
	if (sesion.tipo !== "usuario" || !id) throw new ForbiddenError();
	const usuario = await prisma.usuario.findUnique({ where: { id }, select: { rol: true } });
	if (usuario?.rol !== "ADMINISTRADOR") throw new ForbiddenError();
	if (c.req.method !== "GET") {
		const origenes = origenesPermitidos();
		if (!origenes.includes(c.req.header("origin") || ""))
			throw new ForbiddenError("Origen no autorizado.");
	}
	await next();
});
app.use("*", bodyLimit({ maxSize: 8192 }));
app.get("/", async (c) => {
	const estado = z
		.enum(["PENDIENTE_REVISION", "PUBLICADO", "OCULTADO"])
		.safeParse(c.req.query("estado") || "PENDIENTE_REVISION");
	const pagina = Number(c.req.query("pagina") || 1);
	if (!estado.success || !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000)
		throw new BadRequestError();
	const where = { estado: estado.data };
	const [valoraciones, total] = await Promise.all([
		prisma.comentario.findMany({
			where,
			orderBy: [{ creado_en: "asc" }, { id: "asc" }],
			take: 30,
			skip: (pagina - 1) * 30,
			select: {
				id: true,
				texto: true,
				calificacion: true,
				estado: true,
				creado_en: true,
				usuario: { select: { nombres: true } },
				ubicacion: { select: { id: true, nombre: true } },
			},
		}),
		prisma.comentario.count({ where }),
	]);
	return c.json({ valoraciones, total, pagina, porPagina: 30 });
});
app.patch("/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	const datos = z
		.object({ estado: z.enum(["PUBLICADO", "OCULTADO"]) })
		.strict()
		.safeParse(await c.req.json().catch(() => null));
	if (!id || !datos.success) throw new BadRequestError();
	const resultado = await prisma.comentario.updateMany({ where: { id }, data: datos.data });
	if (!resultado.count) throw new NotFoundError();
	return c.json({ id, estado: datos.data.estado });
});
export { app as ModeracionValoracionesRoute };
