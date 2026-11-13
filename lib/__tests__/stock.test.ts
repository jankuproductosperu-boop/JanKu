import { describe, expect, it } from "vitest";
import { estadoDeStock } from "@/lib/stock";

describe("estadoDeStock", () => {
  it("0 es Agotado", () => expect(estadoDeStock(0)).toBe("Agotado"));
  it("negativo es Agotado", () => expect(estadoDeStock(-1)).toBe("Agotado"));
  it("igual al mínimo por defecto es Limitado", () => expect(estadoDeStock(5)).toBe("Limitado"));
  it("sobre el mínimo es Disponible", () => expect(estadoDeStock(6)).toBe("Disponible"));
  it("respeta un mínimo propio", () => expect(estadoDeStock(3, 2)).toBe("Disponible"));
  it("igual al mínimo propio es Limitado", () => expect(estadoDeStock(2, 2)).toBe("Limitado"));
});
