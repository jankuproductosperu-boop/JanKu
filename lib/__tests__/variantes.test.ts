import { describe, expect, it } from "vitest";
import {
  combinaciones,
  etiquetaVariante,
  lineaId,
  precioDeVariante,
  precioDesde,
  stockTotal,
  tieneVariantes,
  validarVariantes,
} from "@/lib/variantes";

const color = { nombre: "Color", valores: ["Negro", "Rosado"] };
const talla = { nombre: "Talla", valores: ["S", "M"] };

describe("tieneVariantes", () => {
  it("sin campo", () => expect(tieneVariantes({})).toBe(false));
  it("arreglo vacío", () => expect(tieneVariantes({ variantes: [] })).toBe(false));
  it("con una", () => expect(tieneVariantes({ variantes: [{}] })).toBe(true));
});

describe("combinaciones", () => {
  it("producto cartesiano en orden estable", () =>
    expect(combinaciones([color, talla])).toEqual([
      { Color: "Negro", Talla: "S" },
      { Color: "Negro", Talla: "M" },
      { Color: "Rosado", Talla: "S" },
      { Color: "Rosado", Talla: "M" },
    ]));
  it("una opción", () => expect(combinaciones([color])).toEqual([{ Color: "Negro" }, { Color: "Rosado" }]));
  it("sin opciones", () => expect(combinaciones([])).toEqual([]));
});

describe("etiquetaVariante", () => {
  it("respeta el orden de las opciones", () =>
    expect(etiquetaVariante({ Talla: "M", Color: "Negro" }, ["Color", "Talla"])).toBe("Color: Negro · Talla: M"));
  it("sin orden usa el del objeto", () => expect(etiquetaVariante({ Color: "Negro" })).toBe("Color: Negro"));
});

describe("validarVariantes", () => {
  it("correcto", () =>
    expect(validarVariantes([color], [{ combinacion: { Color: "Negro" } }, { combinacion: { Color: "Rosado" } }])).toBeNull());
  it("sin opciones ni variantes es válido (producto sin variantes)", () => expect(validarVariantes([], [])).toBeNull());
  it("combinación repetida", () =>
    expect(validarVariantes([color], [{ combinacion: { Color: "Negro" } }, { combinacion: { Color: "Negro" } }])).toMatch(
      /repetida/,
    ));
  it("valor inexistente", () => expect(validarVariantes([color], [{ combinacion: { Color: "Azul" } }])).toMatch(/no existe/));
  it("opción faltante", () =>
    expect(validarVariantes([color, talla], [{ combinacion: { Color: "Negro" } }])).toMatch(/no indica «Talla»/));
  it("opción no definida", () =>
    expect(validarVariantes([color], [{ combinacion: { Color: "Negro", Talla: "S" } }])).toMatch(/no está definida/));
  it("valor repetido en una opción", () =>
    expect(validarVariantes([{ nombre: "Color", valores: ["Negro", "negro"] }], [{ combinacion: { Color: "Negro" } }])).toMatch(
      /repetido/,
    ));
  it("opciones sin variantes", () => expect(validarVariantes([color], [])).toMatch(/al menos una variante/));
});

describe("stockTotal", () => {
  it("ignora inactivas", () =>
    expect(
      stockTotal([
        { stockCantidad: 10, activo: true },
        { stockCantidad: 9, activo: true },
        { stockCantidad: 50, activo: false },
      ]),
    ).toBe(19));
  it("vacío es 0", () => expect(stockTotal([])).toBe(0));
});

describe("precios", () => {
  it("hereda el del producto", () => expect(precioDeVariante(20, {})).toBe(20));
  it("usa el propio", () => expect(precioDeVariante(20, { precio: 25 })).toBe(25));
  it("precio propio 0 se respeta", () => expect(precioDeVariante(20, { precio: 0 })).toBe(0));
  it("desde: mínimo entre activas y varía", () =>
    expect(precioDesde({ precio: 20, variantes: [{}, { precio: 15 }, { precio: 5, activo: false }] })).toEqual({
      precio: 15,
      varia: true,
    }));
  it("desde: todos iguales no varía", () =>
    expect(precioDesde({ precio: 20, variantes: [{}, { precio: 20 }] })).toEqual({ precio: 20, varia: false }));
  it("desde: sin variantes", () => expect(precioDesde({ precio: 20 })).toEqual({ precio: 20, varia: false }));
});

describe("lineaId", () => {
  it("sin variante es el id del producto", () => expect(lineaId("p1")).toBe("p1"));
  it("con variante", () => expect(lineaId("p1", "v1")).toBe("p1:v1"));
});
