import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";
import { prisma } from "../configuracion/db.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);

// Comprobar que el servidor y MySQL responden.
app.get("/health", async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({ api: "ok", database: "ok" });
    } catch {
        return c.json({ api: "ok", database: "error" }, 503);
    }
});

export { app as AppRouter };
