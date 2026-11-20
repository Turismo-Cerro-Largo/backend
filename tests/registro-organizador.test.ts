import { describe, expect, it } from "vitest";
import { auth_organizador_register_scheem } from "../src/app/auth/auth.schema.js";
const rut = auth_organizador_register_scheem.shape.rut;
describe("RUT opcional", () => {
 it.each([undefined, null, "", "   "])("normaliza ausencia a null: %s", (valor) => expect(rut.parse(valor)).toBeNull());
 it("conserva un RUT valido", () => expect(rut.parse(" 211234560018 ")).toBe("211234560018"));
 it.each(["123", "abcdefghijkl", 123])("rechaza valor invalido: %s", (valor) => expect(rut.safeParse(valor).success).toBe(false));
});
