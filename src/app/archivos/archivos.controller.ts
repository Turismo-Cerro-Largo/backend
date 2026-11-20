import { Hono } from "hono";
import { leerSesion, VerificarSessionRol } from "../../middleware/Session.js";
import * as servicio from "./archivos.service.js";

const app = new Hono();

app.get("/publicos/:archivo", async (c) =>
	c.redirect(await servicio.publico(c.req.param("archivo"), () => leerSesion(c)), 307),
);

app.get("/publicos/seed/:archivo", async (c) =>
	c.redirect(await servicio.seed(c.req.param("archivo"), () => leerSesion(c)), 307),
);

app.get("/privados/:archivo", VerificarSessionRol(["ORGANIZADOR", "ADMINISTRADOR"]), async (c) => {
	const { contenido, tipo } = await servicio.privado(c.req.param("archivo"), c.get("sesion"));
	return c.body(contenido, 200, {
		"Content-Type": tipo,
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff",
	});
});

export { app as ArchivosRoute };
