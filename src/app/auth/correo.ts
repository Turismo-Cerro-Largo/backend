import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
export function correoConfigurado() {
	return process.env.MAIL_MODE === "local"
		? process.env.NODE_ENV !== "production" &&
				/^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || "")
		: process.env.MAIL_MODE === "smtp" &&
				Boolean(
					process.env.SMTP_HOST &&
						process.env.SMTP_FROM &&
						process.env.SMTP_USER &&
						process.env.SMTP_PASSWORD,
				);
}
export function origenRecuperacion() {
	const url = new URL(process.env.APP_PUBLIC_URL || "http://localhost:5173");
	if (
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash ||
		!["https:", "http:"].includes(url.protocol)
	)
		throw new Error("APP_PUBLIC_URL debe ser un origen válido.");
	if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
		throw new Error("APP_PUBLIC_URL requiere HTTPS.");
	return url.origin;
}
export async function enviarRecuperacion(email: string, token: string) {
	if (!correoConfigurado()) throw new Error("Correo no configurado.");
	// El fragmento no viaja en Referer, solicitudes GET ni logs HTTP.
	const enlace = `${origenRecuperacion()}/restablecer-contrasena#token=${token}`;
	const mensaje = {
		from: process.env.SMTP_FROM || "Cerro Largo 360 <no-reply@example.invalid>",
		to: email,
		subject: "Recuperá tu acceso a Cerro Largo 360",
		text: `Recibimos una solicitud para cambiar tu contraseña.\n\nAbrí este enlace en los próximos 20 minutos:\n${enlace}\n\nSolo se puede usar una vez. Si no lo solicitaste, ignorá este mensaje; tu contraseña no cambió.`,
	};
	if (process.env.MAIL_MODE === "local") {
		const dir = path.resolve(".local-mail");
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, `${randomUUID()}.json`), JSON.stringify(mensaje, null, 2), {
			flag: "wx",
			mode: 0o600,
		});
		return;
	}
	const port = Number(process.env.SMTP_PORT || 587);
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Puerto SMTP inválido.");
	const transport = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port,
		secure: port === 465,
		requireTLS: port !== 465,
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 15000,
		disableFileAccess: true,
		disableUrlAccess: true,
	});
	try {
		await transport.sendMail(mensaje);
	} finally {
		transport.close();
	}
}
