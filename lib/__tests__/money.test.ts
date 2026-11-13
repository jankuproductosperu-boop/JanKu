import { describe, expect, it } from "vitest";
import { formatearSoles, redondear2 } from "@/lib/money";

describe("redondear2", () => {
  it("redondea 1.005 a 1.01", () => expect(redondear2(1.005)).toBe(1.01));
  it("deja enteros intactos", () => expect(redondear2(10)).toBe(10));
  it("corrige el error de coma flotante", () => expect(redondear2(0.1 + 0.2)).toBe(0.3));
});

describe("formatearSoles", () => {
  it("formatea con dos decimales", () => expect(formatearSoles(12.5)).toBe("S/ 12.50"));
  it("formatea enteros", () => expect(formatearSoles(3)).toBe("S/ 3.00"));
});
