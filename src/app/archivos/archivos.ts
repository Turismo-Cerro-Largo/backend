import { recursoVisible } from "../catalogo/acceso-recursos.js";
// src/app/archivos/archivos.ts
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { getMimeType } from "hono/utils/mime";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";

const app = new Hono();

app.get('/publicos/:archivo', async c => {
 const archivo=c.req.param('archivo');
 if(!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4)$/.test(archivo))throw new NotFoundError();
 const recurso=await recursoVisible(c,{uri:{in:[`/api/archivos/publicos/${archivo}`,`/publicos/${archivo}`]}});
 if(!recurso)throw new NotFoundError();
 return c.redirect(`/api/recursos/${recurso.id}`,307);
});

app.get('/publicos/seed/:archivo', async c => {
 const archivo=c.req.param('archivo');
 if(!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4)$/.test(archivo))throw new NotFoundError();
 const uri=`/api/archivos/publicos/seed/${archivo}`;
 const recurso=await recursoVisible(c,{uri:{in:[uri,`/publicos/seed/${archivo}`]}});
 if(!recurso)throw new NotFoundError();
 return c.redirect(`/api/recursos/${recurso.id}`,307);
});

app.get("/privados/:archivo", VerificarSessionRol(["ORGANIZADOR", "ADMINISTRADOR"]), async (c) => {
	if (c.req.param("archivo") !== path.basename(c.req.param("archivo"))) throw new BadRequestError();

	if (!await prisma.documentoOrganizador.findFirst({
		where: {
			uri: c.req.param("archivo"),
			...(c.get("sesion").rol === "ADMINISTRADOR" ? {} : { id_organizador: Number(c.get("sesion").id) }),
		},
		select: { id: true },
	})) throw new NotFoundError();

	const contenido = await readFile(path.join(process.cwd(), "privados", c.req.param("archivo"))).catch(() => null);

	if (!contenido) throw new NotFoundError();

	return c.body(contenido, 200, {
		"Content-Type": getMimeType(c.req.param("archivo")) ?? "application/octet-stream",
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff"
	});
});

export { app as ArchivosRoute };
