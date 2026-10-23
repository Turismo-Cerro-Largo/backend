import { Hono } from "hono";
import { RequerirAdministrador } from "../../middleware/Session.js";
import { obtenerResumenAdmin } from "./dashboard.service.js";

const app = new Hono();
app.get("/", RequerirAdministrador, async (c) => c.json(await obtenerResumenAdmin()));

export { app as DashboardAdminRoute };
