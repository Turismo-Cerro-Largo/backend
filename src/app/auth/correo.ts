import { env } from "../../configuracion/env.js";
import { current } from "../../configuracion/runtime.js";
export function correoConfigurado() {
	return Boolean(current().bindings.EMAIL && env.MAIL_FROM);
}
export function origenRecuperacion() {
	const url = new URL(env.APP_PUBLIC_URL);
	if (
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash ||
		!["https:", "http:"].includes(url.protocol) ||
		(env.NODE_ENV === "production" && url.protocol !== "https:")
	)
		throw new Error("APP_PUBLIC_URL debe ser un origen HTTPS válido.");
	return url.origin;
}
export async function enviarRecuperacion(email: string, token: string) {
	if (!correoConfigurado()) throw new Error("Configurar EMAIL y MAIL_FROM.");
	const enlace =
		origenRecuperacion() + "/restablecer-contrasena#token=" + encodeURIComponent(token);
	await current().bindings.EMAIL!.send({
		from: { email: env.MAIL_FROM!, name: env.MAIL_FROM_NAME || "Cerro Largo 360" },
		to: email,
		subject: "Recuperá tu acceso a Cerro Largo 360",
		text:
			"Abrí este enlace en los próximos 20 minutos para cambiar tu contraseña:\n" +
			enlace +
			"\nSolo puede usarse una vez. Si no lo solicitaste, ignorá este mensaje.",
	});
}
