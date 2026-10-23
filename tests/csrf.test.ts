import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { Configuracion } from "../src/configuracion/configuracion.js";

const origen = "https://turismo.example.com";
function crearApp() {
    vi.stubEnv("APP_ORIGINS", `${origen},https://desarrollo.turismo.example.com`);
    const app = new Hono();
    Configuracion(app);
    app.post("/prueba", c => c.json({ ok: true }));
    return app;
}
afterEach(() => vi.unstubAllEnvs());

describe("CSRF oficial y orígenes de entorno", () => {
    it("acepta ambos orígenes configurados en formularios", async () => {
        const app = crearApp();
        for (const origin of [origen, "https://desarrollo.turismo.example.com"]) {
            const r = await app.request("/prueba", { method: "POST", headers: { origin, "content-type": "application/x-www-form-urlencoded" }, body: "nombre=prueba" });
            expect(r.status).toBe(200);
        }
    });
    it("rechaza formularios de otro origen con el 403 oficial y no 500", async () => {
        const r = await crearApp().request("/prueba", { method: "POST", headers: { origin: "https://ajeno.example", "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "cross-site" }, body: "nombre=prueba" });
        expect(r.status).toBe(403);
        expect(await r.text()).toBe("Forbidden");
    });
    it("conserva el rechazo de JSON ajeno y permite el frontend autorizado", async () => {
        const app = crearApp();
        const request = (origin: string) => app.request("/prueba", { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
        expect((await request("https://ajeno.example")).status).toBe(403);
        expect((await request(origen)).status).toBe(200);
    });
    it("conserva el preflight CORS con credenciales", async () => {
        const r = await crearApp().request("/prueba", { method: "OPTIONS", headers: { origin: origen, "access-control-request-method": "POST" } });
        expect(r.status).toBe(204);
        expect(r.headers.get("access-control-allow-origin")).toBe(origen);
        expect(r.headers.get("access-control-allow-credentials")).toBe("true");
    });
});
