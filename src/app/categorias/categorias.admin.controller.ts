import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import * as categorias from "./categorias.service.js";

const app = new Hono();

app.post("/", RequerirAdministrador, bodyLimitado(10, "KB"), async (c) =>
	c.json(await categorias.crear(await c.req.parseBody()), 201),
);

app.put("/:id", RequerirAdministrador, bodyLimitado(10, "KB"), async (c) => {
	const id = categorias.validarId(c.req.param("id"));
	return c.json(await categorias.editar(id, await c.req.parseBody()));
});

app.delete("/:id", RequerirAdministrador, async (c) => {
	await categorias.eliminar(categorias.validarId(c.req.param("id")));
	return c.body(null, 204);
});

export { app as CategoriasAdminRoute };
