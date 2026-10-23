import { Hono } from "hono";
import { HealthRoute } from "../health/health.js";
import { CategoriasRoute } from "../categorias/categorias.js";
import { ArchivosRoute } from "../archivos/archivos.js";
import { TransporteRoute } from "../transporte/transporte.js";
import { EventosRoute } from "../eventos/eventos.js";
import { UbicacionesRoute } from "../ubicaciones/ubicaciones.js";
import { LugaresRoute } from "./lugares.js";
import { LocalidadesRoute } from "./localidades.js";
import { PublicoRoute } from "../catalogo/catalogo.js";
import { consultarHorarios } from "../catalogo/transporte.js";

// Las rutas públicas conservan sus URLs. Algunas rutas históricas tienen
// mutaciones de administrador/organizador protegidas dentro de su módulo.
const app = new Hono();
app.route("/healt", HealthRoute);
app.route("/categorias", CategoriasRoute);
app.route("/archivos", ArchivosRoute);
app.route("/transporte", TransporteRoute);
app.route("/eventos", EventosRoute);
app.route("/ubicaciones", UbicacionesRoute);
app.route("/lugares", LugaresRoute);
app.route("/localidades", LocalidadesRoute);
app.get("/horarios-omnibus", consultarHorarios);
app.route("/", PublicoRoute);

export { app as PublicoRouter };

