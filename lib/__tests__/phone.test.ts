import { describe, expect, it } from "vitest";
import { normalizarTelefono } from "@/lib/phone";

describe("normalizarTelefono", () => {
  it("9 dígitos con espacios", () => expect(normalizarTelefono("987 654 321")).toBe("51987654321"));
  it("con +51", () => expect(normalizarTelefono("+51 987654321")).toBe("51987654321"));
  it("con 51 y guiones", () => expect(normalizarTelefono("51-987-654-321")).toBe("51987654321"));
  it("ya normalizado", () => expect(normalizarTelefono("51987654321")).toBe("51987654321"));
  it("8 dígitos", () => expect(normalizarTelefono("12345678")).toBeNull());
  it("no empieza por 9", () => expect(normalizarTelefono("887654321")).toBeNull());
  it("11 dígitos sin 519", () => expect(normalizarTelefono("51887654321")).toBeNull());
  it("demasiado largo", () => expect(normalizarTelefono("0051987654321")).toBeNull());
  it("vacío", () => expect(normalizarTelefono("")).toBeNull());
  it("solo letras", () => expect(normalizarTelefono("abc")).toBeNull());
});
