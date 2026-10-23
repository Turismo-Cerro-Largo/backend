// src/configuracion/configuracion.ts
import { verificarOrigen, origenesPermitidos } from "../middleware/Origen.js";
import type { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { AppError } from "./AppError.js";

/**
 * Helper para cargar los middleware
 * @param app
 */
export const Configuracion = (app: Hono) => {
	app.use("*", logger());

	app.use("*", cors({origin: origin => origenesPermitidos().includes(origin) ? origin : undefined,credentials:true}));
 	app.use("*", csrf({ origin: origenesPermitidos() }));
	// El middleware oficial cubre formularios. Esta regla conserva el control de JSON.
	app.use("*", verificarOrigen);

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

		if (err instanceof HTTPException) return err.getResponse();

		return c.json(
			{
				message: "Internal Server Error",
			},
			500,
		);
	});
};

