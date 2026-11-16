import { app } from "./app.js";
import { conBaseDeDatos } from "./configuracion/db.js";

export default {
	fetch(
		request: Request,
		env: { DATABASE_URL: string; DATABASE_CA_CERT?: string; HYPERDRIVE?: { connectionString: string } },
	) {
		const url = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
		const ca = env.HYPERDRIVE ? undefined : env.DATABASE_CA_CERT;
		return conBaseDeDatos(url, async () => app.fetch(request), ca);
	},
};
