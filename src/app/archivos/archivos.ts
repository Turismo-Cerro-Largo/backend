import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const app = new Hono();

app.use(
	"/publico/*",
	serveStatic({
		root: "./publico",
	}),
);

// app.get("/privado/:archivo", async (con) => {});

export { app as ArchivosRoute };
