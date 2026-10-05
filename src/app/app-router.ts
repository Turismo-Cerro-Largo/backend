import { Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";

const app = new Hono().basePath("/api");

app.route("/auth", AuthRoute);

export { app as AppRouter };
