import { origenRecuperacion } from "./correo.js";
import { admitirIntento } from "./recuperacion.service.js";
import { type Context, Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { BadRequestError } from "../../configuracion/AppError.js";
import { ArchivosPrivados } from "../../middleware/Archivos.js";
import { Google } from "../../middleware/Google.js";
import { bodyLimitado } from "../../middleware/Limit.js";
import { verificarTurnstile } from "../../middleware/Turnstile.js";
import { VERSION_DOCUMENTOS_ORGANIZADOR } from "./auth.schema.js";
import { crear_sesion, leerSesion } from "../../middleware/Session.js";
import * as servicio from "./auth.service.js";

const app = new Hono();

app.post(
	"/login",
	bodyLimitado(32, "KB"),
	async (c, next) => {
		if (!admitirIntento("login-global", 500))
			return c.json({ message: "Demasiados intentos. Esperá unos minutos." }, 429);
		await next();
	},
	verificarTurnstile("login"),
	async (c) => {
		const resultado = await servicio.iniciarSesion(await c.req.parseBody());
		if (resultado.status === 200) await crear_sesion(c, resultado.cuenta);
		return c.json(resultado.datos, resultado.status);
	},
);

app.post("/register", bodyLimitado(64, "KB"), verificarTurnstile("register"), async (c) => {
	const resultado = await servicio.registrarTurista(await c.req.parseBody());
	return c.json(resultado.datos, resultado.status);
});

app.post(
	"/register-organizador",
	bodyLimitado(20, "MB"),
	async (c, next) => {
		const body = await c.req.parseBody();

		if (
			body.aceptaTerminos !== "si" ||
			body.aceptaPrivacidad !== "si" ||
			body.versionDocumentos !== VERSION_DOCUMENTOS_ORGANIZADOR
		) {
			throw new BadRequestError("Debés aceptar los términos y la política de privacidad.");
		}

		await next();
	},
	verificarTurnstile("register-organizador"),
	ArchivosPrivados(),
	async (c) => {
		const resultado = await servicio.registrarOrganizador(
			await c.req.parseBody(),
			c.get("fotoCedulaFrente"),
			c.get("fotoCedulaDorso"),
		);
		return c.json(resultado.datos, resultado.status);
	},
);

app.get("/google", Google(), async (c) => {
	await crear_sesion(c, await servicio.iniciarConGoogle(c.get("user-google")));
	return c.redirect(origenRecuperacion() + "/");
});

app.get("/check", async (c) => {
	const sesion = await leerSesion(c);
	c.header("Cache-Control", "private, no-store");
	return c.json(await servicio.consultarSesion(sesion));
});

app.on(["POST"], "/logout", async (c: Context) => {
	deleteCookie(c, "session", { path: "/" });
	return c.json({ message: "Exito" }, 200);
});

export { app as AuthRoute };
