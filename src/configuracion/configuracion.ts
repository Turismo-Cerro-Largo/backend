import type { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { AppError } from "./AppError.js";

/**
 * Helper para cargar los middleware
 * @param app
 */
export const Configuracion = (app: Hono) => {
	app.use("*", logger());

	app.use("*", cors());

	app.use(
		"*",
		secureHeaders({
			strictTransportSecurity: "max-age=31536000; includeSubDomains",
			xFrameOptions: "DENY",
			permissionsPolicy: {
				camera: [],
				microphone: [],
				geolocation: [],
				payment: [],
				usb: [],
			},
		}),
	);

	// Control de errores
	app.onError((err, c) => {
		if (err instanceof AppError) {
			return c.json(
				{
					message: err.message,
				},
				err.statusCode as any,
			);
		}

		return c.json(
			{
				message: "Internal Server Error",
			},
			500,
		);
	});
};
