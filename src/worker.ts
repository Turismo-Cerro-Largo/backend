import { app } from "./app.js";
import { conBaseDeDatos } from "./configuracion/db.js";

export default {
	fetch(request: Request, env: { DATABASE_URL: string }) {
		return conBaseDeDatos(env.DATABASE_URL, async () => app.fetch(request));
	},
};
