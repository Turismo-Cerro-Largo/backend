import { Hono } from "hono";
import { BadRequestError } from "../../configuracion/AppError.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { ArchivosFotoPerfil } from "../../middleware/Archivos.js";
import { RequerirTurista } from "../../middleware/Session.js";
import { perfilSchema, valoracionSchema } from "./turista.schema.js";
import { idValido } from "../shared/parametros.js";
import { turistaService } from "./turista.service.js";

const app = new Hono();
app.use("*", RequerirTurista);
app.use("*", bodyLimitado(4, "MB"));

app.get("/perfil", async (c) => c.json(await turistaService.perfil(c.get("turistaId"))));
app.put("/perfil", async (c) => {
	const datos = perfilSchema.safeParse(await c.req.json().catch(() => null));
	if (!datos.success)
		throw new BadRequestError("Revisá los datos del perfil. Solo se admiten los campos editables.");
	return c.json(await turistaService.editarPerfil(c.get("turistaId"), datos.data));
});

app.get("/foto", async (c) => {
	const { bytes, tipo } = await turistaService.foto(c.get("turistaId"));
	c.header("Content-Type", tipo);
	c.header("X-Content-Type-Options", "nosniff");
	return c.body(new Uint8Array(bytes));
});
app.put("/foto", ArchivosFotoPerfil(), async (c) =>
	c.json(await turistaService.cambiarFoto(c.get("turistaId"), c.get("fotoPerfil"))));
app.delete("/foto", async (c) => c.json(await turistaService.borrarFoto(c.get("turistaId"))));

app.get("/favoritos", async (c) => c.json(await turistaService.favoritos(c.get("turistaId"))));
app.put("/favoritos/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	return c.json(await turistaService.guardarFavorito(c.get("turistaId"), id));
});
app.delete("/favoritos/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	return c.json(await turistaService.borrarFavorito(c.get("turistaId"), id));
});

app.get("/valoraciones", async (c) => c.json(await turistaService.valoraciones(c.get("turistaId"))));
app.delete("/valoraciones/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	return c.json(await turistaService.borrarValoracion(c.get("turistaId"), id));
});

app.get("/lugares/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	return c.json(await turistaService.estadoLugar(c.get("turistaId"), id));
});
app.post("/lugares/:id/valoracion", async (c) => {
	const id = idValido(c.req.param("id"));
	const datos = valoracionSchema.safeParse(await c.req.json().catch(() => null));
	if (!id || !datos.success)
		throw new BadRequestError("Elegí de 1 a 5 estrellas y un comentario de hasta 2000 caracteres.");
	return c.json({ valoracion: await turistaService.crearValoracion(c.get("turistaId"), id, datos.data) }, 201);
});

export { app as TuristaRoute };
