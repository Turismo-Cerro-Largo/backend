import nodemailer from "nodemailer";
import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

function cuentaGmail() {
    const user = process.env.GMAIL_USER?.trim() || "";
    // Google presenta la contraseña de aplicación en grupos separados por espacios.
    const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, "");
    if (!z.email().safeParse(user).success || !/^[a-zA-Z0-9]{16}$/.test(pass)) return null;
    return { user, pass };
}

export function correoConfigurado() {
    if (process.env.MAIL_MODE === "local") {
        return process.env.NODE_ENV !== "production" &&
            /^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || "");
    }
    return process.env.MAIL_MODE === "gmail" && cuentaGmail() !== null;
}

export function origenRecuperacion() {
    const url = new URL(process.env.APP_PUBLIC_URL || "http://localhost:5173");
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || !["https:", "http:"].includes(url.protocol)) {
        throw new Error("APP_PUBLIC_URL debe ser un origen válido.");
    }
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
        throw new Error("APP_PUBLIC_URL requiere HTTPS.");
    }
    return url.origin;
}

export async function enviarRecuperacion(email: string, token: string) {
    if (!correoConfigurado()) throw new Error("Correo no configurado.");
    const gmail = cuentaGmail();
    // El fragmento no viaja en Referer, solicitudes GET ni logs HTTP.
    const enlace = `${origenRecuperacion()}/restablecer-contrasena#token=${encodeURIComponent(token)}`;
    const mensaje = {
        from: {
            name: process.env.MAIL_FROM_NAME?.trim() || "Cerro Largo 360",
            address: gmail?.user || "no-reply@example.invalid",
        },
        to: email,
        subject: "Recuperá tu acceso a Cerro Largo 360",
        text: `Recibimos una solicitud para cambiar tu contraseña.\n\nAbrí este enlace en los próximos 20 minutos:\n${enlace}\n\nSolo se puede usar una vez. Si no lo solicitaste, ignorá este mensaje; tu contraseña no cambió.`,
    };
    if (process.env.MAIL_MODE === "local") {
        const dir = path.resolve(".local-mail");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, `${randomUUID()}.json`), JSON.stringify(mensaje, null, 2), { flag: "wx", mode: 0o600 });
        return;
    }
    if (!gmail) throw new Error("Configurá GMAIL_USER y una contraseña de aplicación de Google de 16 caracteres.");
    const transport = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        auth: gmail,
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
