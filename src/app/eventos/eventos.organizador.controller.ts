import * as eventos from "./eventos.service.js";
import { recursoVisible } from "../catalogo/acceso-recursos.js";
// src/app/organizador/eventos.ts
import { Hono } from "hono";
import { NotFoundError } from "../../configuracion/AppError.js";
import { ArchivosPublicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { leerSesion, RequerirOrganizadorAprobado } from "../../middleware/Session.js";

const app = new Hono();

app.get("/eventos/media/:nombre", async (c) => {
	const nombre = c.req.param("nombre");
	if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) throw new NotFoundError();
	const recurso = await recursoVisible(() => leerSesion(c), {
		uri: `/api/organizador/eventos/media/${nombre}`,
	});
	if (!recurso) throw new NotFoundError();
	return c.redirect(`/api/recursos/${recurso.id}`, 307);
});

app.get("/eventos/categorias", RequerirOrganizadorAprobado, async (c) =>
	c.json(await eventos.categoriasOrganizador()),
);

app.get("/eventos", RequerirOrganizadorAprobado, async (c) =>
	c.json(await eventos.listarPropios(c.get("sesion"))),
);

app.get("/eventos/:id", RequerirOrganizadorAprobado, async (c) =>
	c.json(await eventos.detallePropio(c.req.param("id")!, c.get("sesion"))),
);

app.post(
	"/eventos",
	RequerirOrganizadorAprobado,
	bodyLimitado(26, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 5, 5),
	async (c) =>
		c.json(
			await eventos.crearPropio(
				await c.req.parseBody({ all: true }),
				c.get("sesion"),
				c.get("recursos"),
			),
			201,
		),
);

app.put(
	"/eventos/:id",
	RequerirOrganizadorAprobado,
	bodyLimitado(26, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 5, 5),
	async (c) =>
		c.json(
			await eventos.editarPropio(
				await c.req.parseBody({ all: true }),
				c.req.param("id")!,
				c.get("sesion"),
				c.get("recursos"),
			),
		),
);

export { app as EventosRoute };
