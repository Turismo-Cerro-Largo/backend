import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mailer = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mailer.createTransport } }));
import { correoConfigurado, enviarRecuperacion, origenRecuperacion } from "../src/app/auth/correo.js";

beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MAIL_MODE", "gmail");
    vi.stubEnv("GMAIL_USER", "cuenta@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
    vi.stubEnv("MAIL_FROM_NAME", "Cerro Largo 360");
    vi.stubEnv("APP_PUBLIC_URL", "https://turismo.example.com");
    mailer.createTransport.mockReturnValue({ sendMail: mailer.sendMail, close: mailer.close });
    mailer.sendMail.mockResolvedValue({ messageId: "prueba" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("mailer de Google", () => {
    it("envía por Gmail, normaliza la clave y usa la misma cuenta como remitente", async () => {
        expect(correoConfigurado()).toBe(true);
        await enviarRecuperacion("destino@example.com", "abc123");
        expect(mailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ service: "gmail", secure: true, auth: { user: "cuenta@gmail.com", pass: "abcdefghijklmnop" } }));
        const mensaje = mailer.sendMail.mock.calls[0]![0];
        expect(mensaje.from).toEqual({ name: "Cerro Largo 360", address: "cuenta@gmail.com" });
        expect(mensaje.to).toBe("destino@example.com");
        expect(mensaje.text).toContain("https://turismo.example.com/restablecer-contrasena#token=abc123");
        expect(mensaje.text).not.toContain("abcdefghijklmnop");
        expect(mailer.close).toHaveBeenCalledOnce();
    });
    it("no intenta enviar con configuración incompleta o correo desactivado", async () => {
        vi.stubEnv("GMAIL_APP_PASSWORD", "");
        expect(correoConfigurado()).toBe(false);
        await expect(enviarRecuperacion("destino@example.com", "token")).rejects.toThrow("Correo no configurado");
        vi.stubEnv("MAIL_MODE", "disabled");
        expect(correoConfigurado()).toBe(false);
        expect(mailer.createTransport).not.toHaveBeenCalled();
    });
    it("cierra el transporte cuando Google devuelve un error", async () => {
        mailer.sendMail.mockRejectedValueOnce(new Error("Error SMTP simulado"));
        await expect(enviarRecuperacion("destino@example.com", "token")).rejects.toThrow("Error SMTP simulado");
        expect(mailer.close).toHaveBeenCalledOnce();
    });
    it("restringe el buzón local a bases aisladas fuera de producción", () => {
        vi.stubEnv("MAIL_MODE", "local");
        vi.stubEnv("DATABASE_NAME", "cerrolargo_turista_test_mail");
        expect(correoConfigurado()).toBe(true);
        vi.stubEnv("NODE_ENV", "production");
        expect(correoConfigurado()).toBe(false);
    });
    it("exige HTTPS en enlaces de recuperación de producción", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("APP_PUBLIC_URL", "http://turismo.example.com");
        expect(origenRecuperacion).toThrow("requiere HTTPS");
    });
});
