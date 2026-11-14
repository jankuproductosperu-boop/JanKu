import { describe, expect, it } from "vitest";
import { estadoDeStock, stockResultante, tipoPorDefecto } from "@/lib/stock";

describe("estadoDeStock", () => {
  it("0 es Agotado", () => expect(estadoDeStock(0)).toBe("Agotado"));
  it("negativo es Agotado", () => expect(estadoDeStock(-1)).toBe("Agotado"));
  it("igual al mínimo por defecto es Limitado", () => expect(estadoDeStock(5)).toBe("Limitado"));
  it("sobre el mínimo es Disponible", () => expect(estadoDeStock(6)).toBe("Disponible"));
  it("respeta un mínimo propio", () => expect(estadoDeStock(3, 2)).toBe("Disponible"));
  it("igual al mínimo propio es Limitado", () => expect(estadoDeStock(2, 2)).toBe("Limitado"));
});

describe("stockResultante", () => {
  it("sumar", () => expect(stockResultante("sumar", 4, 3)).toBe(7));
  it("restar", () => expect(stockResultante("restar", 4, 3)).toBe(1));
  it("restar más de lo que hay devuelve negativo (el servicio lo rechaza)", () =>
    expect(stockResultante("restar", 4, 99)).toBe(-95));
  it("fijar ignora la cantidad anterior", () => expect(stockResultante("fijar", 4, 10)).toBe(10));
  it("fijar en 0", () => expect(stockResultante("fijar", 4, 0)).toBe(0));
});

describe("tipoPorDefecto", () => {
  it("sumar es entrada", () => expect(tipoPorDefecto("sumar")).toBe("entrada"));
  it("restar es salida", () => expect(tipoPorDefecto("restar")).toBe("salida"));
  it("fijar es ajuste", () => expect(tipoPorDefecto("fijar")).toBe("ajuste"));
});
