import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");

describe("Roles de las cuentas", () => {
    it("usa Usuario para turistas y administradores", () => {
        expect(schema).toMatch(/model Usuario \{/);
        expect(schema).toMatch(/enum Rol \{\s*TURISTA\s+ADMINISTRADOR\s*\}/);
    });

    it("guarda organizadores por separado", () => {
        expect(schema).toMatch(/model Organizador \{/);
        expect(schema).toMatch(/model DocumentoOrganizador \{/);
        expect(schema).toMatch(/enum EstadoOrganizador \{/);
    });
});
