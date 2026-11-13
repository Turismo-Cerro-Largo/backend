import nodemailer from "nodemailer";
import { connect } from "node:tls";
import { env } from "../../configuracion/env.js";
import { current } from "../../configuracion/runtime.js";

function cuentaGmail() {
	const user = env.GMAIL_USER;
	const pass = env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
	return user && /^[^\s@]+@[^\s@]+$/.test(user) && pass && /^[a-zA-Z0-9]{16}$/.test(pass)
		? { user, pass }
		: null;
}

export function correoConfigurado() {
	return Boolean((current().bindings.EMAIL && env.MAIL_FROM) || cuentaGmail());
}

async function enviar(to: string, subject: string, text: string) {
	const name = env.MAIL_FROM_NAME || "Cerro Largo 360";
	const email = current().bindings.EMAIL;
	if (email && env.MAIL_FROM) {
		await email.send({ from: { email: env.MAIL_FROM, name }, to, subject, text });
		return;
	}

	const auth = cuentaGmail();
	if (!auth) throw new Error("Correo no configurado.");
	const host = "smtp.gmail.com";
	const socket = connect({ host, port: 465, servername: host });
	try {
		const transport = nodemailer.createTransport({
			host,
			port: 465,
			secure: true,
			auth,
			connectionTimeout: 8000,
			greetingTimeout: 8000,
			socketTimeout: 12000,
			getSocket: (_options, callback) => callback(null, { connection: socket, secured: true }),
		});
		try {
			await transport.sendMail({ from: { address: auth.user, name }, to, subject, text });
		} finally {
			transport.close();
		}
	} finally {
		socket.destroy();
	}
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
	const enlace =
		origenRecuperacion() + "/restablecer-contrasena#token=" + encodeURIComponent(token);
	await enviar(
		email,
		"Recuperá tu acceso a Cerro Largo 360",
		"Abrí este enlace en los próximos 20 minutos para cambiar tu contraseña:\n" +
			enlace +
			"\nSolo puede usarse una vez. Si no lo solicitaste, ignorá este mensaje.",
	);
}

export async function enviarCodigoRegistro(email: string, codigo: string) {
	await enviar(
		email,
		"Verificá tu correo en Cerro Largo 360",
		`Tu código de verificación es ${codigo}. Vence en 15 minutos.`,
	);
}
