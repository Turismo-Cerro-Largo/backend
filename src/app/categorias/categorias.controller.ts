import { Hono } from "hono";
import * as categorias from "./categorias.service.js";

const app = new Hono();

app.get("/", async (c) => c.json(await categorias.listar()));
app.get("/:id", async (c) =>
	c.json(await categorias.buscar(categorias.validarId(c.req.param("id")))),
);

export { app as CategoriasRoute };
