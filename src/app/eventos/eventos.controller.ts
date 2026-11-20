import * as eventos from "./eventos.service.js";
// src/app/eventos/eventos.ts
import { Hono } from "hono";
import {
	VerificarSessionRolVerificada,
	RequerirOrganizadorAprobado,
} from "../../middleware/Session.js";
import { ArchivosPublicos } from "../../middleware/Archivos.js";
import { bodyLimitado } from "../../middleware/Limit.js";

const app = new Hono();

app.get("/", async (c) =>
	c.json(await eventos.listarEventos({ ...c.req.query(), categoria: c.req.queries("categoria") })),
);

app.get("/status", RequerirOrganizadorAprobado, async (c) =>
	c.json(await eventos.resumenOrganizador(c.get("sesion"))),
);

app.get(
	"/organizador/:id_organizador",
	VerificarSessionRolVerificada(["ORGANIZADOR", "ADMINISTRADOR"]),
	async (c) =>
		c.json(
			await eventos.eventosPorOrganizador(
				c.req.param("id_organizador")!,
				c.req.query(),
				c.get("sesion"),
			),
		),
);

app.get("/:id", async (c) => c.json(await eventos.detalleEvento(c.req.param("id"))));

app.post(
	"/",
	RequerirOrganizadorAprobado,
	bodyLimitado(20, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 8),
	async (c) =>
		c.json(
			await eventos.crearEvento(
				await c.req.parseBody({ all: true }),
				c.get("sesion"),
				c.get("recursos"),
			),
			201,
		),
);

app.put(
	"/:id",
	RequerirOrganizadorAprobado,
	bodyLimitado(20, "MB"),
	ArchivosPublicos(["jpg", "jpeg", "png", "webp"], 8),
	async (c) =>
		c.json(
			await eventos.editarEvento(
				await c.req.parseBody({ all: true }),
				c.req.param("id")!,
				c.get("sesion"),
				c.get("recursos"),
			),
		),
);

app.delete("/:id", RequerirOrganizadorAprobado, async (c) => {
	await eventos.eliminarEvento(c.req.param("id")!, c.get("sesion"));
	return c.body(null, 204);
});

export { app as EventosRoute };
