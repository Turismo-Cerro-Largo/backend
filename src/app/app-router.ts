import { Context, Hono } from "hono";
import { AuthRoute } from "./auth/auth.js";

const app = new Hono();

app.route("/auth", AuthRoute);

export { app as AppRouter };
