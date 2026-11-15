import { describe, expect, it } from "vitest";
import { DEPARTAMENTOS, carritoConEntregaGratis, entregaGratis, esDepartamento } from "@/lib/shipping";

describe("carritoConEntregaGratis", () => {
  const productos = [
    { _id: "a", deliveryHuancayo: true },
    { _id: "b", deliveryHuancayo: false },
    { _id: "c" },
  ];
  it("gratis si algún producto del carrito lo tiene", () => {
    expect(carritoConEntregaGratis([{ _id: "b" }, { _id: "a", tipo: "producto" }], productos)).toBe(true);
  });
  it("no gratis si ninguno lo tiene o el campo falta", () => {
    expect(carritoConEntregaGratis([{ _id: "b" }, { _id: "c" }], productos)).toBe(false);
  });
  it("una promoción no cuenta aunque comparta id con un producto marcado", () => {
    expect(carritoConEntregaGratis([{ _id: "a", tipo: "promocion" }], productos)).toBe(false);
  });
  it("un id desconocido (promoción sin tipo) no cuenta; carrito vacío tampoco", () => {
    expect(carritoConEntregaGratis([{ _id: "zzz" }], productos)).toBe(false);
    expect(carritoConEntregaGratis([], productos)).toBe(false);
  });
});

describe("DEPARTAMENTOS", () => {
  it("tiene 24 departamentos más Callao, sin repetidos", () => {
    expect(DEPARTAMENTOS).toHaveLength(25);
    expect(new Set(DEPARTAMENTOS).size).toBe(25);
    expect(DEPARTAMENTOS).toContain("Callao");
    expect(DEPARTAMENTOS).toContain("Junín");
    expect(DEPARTAMENTOS).toContain("Lima");
  });
  it("no incluye «Lima Provincias» (Q3)", () => {
    expect(DEPARTAMENTOS).not.toContain("Lima Provincias");
  });
});

describe("esDepartamento", () => {
  it("acepta solo valores exactos de la lista", () => {
    expect(esDepartamento("Junín")).toBe(true);
    expect(esDepartamento("San Martín")).toBe(true);
    expect(esDepartamento("Junin")).toBe(false);
    expect(esDepartamento("junín")).toBe(false);
    expect(esDepartamento("")).toBe(false);
    expect(esDepartamento("Lima Provincias")).toBe(false);
  });
});

describe("entregaGratis", () => {
  it("es falso con el carrito vacío", () => {
    expect(entregaGratis([])).toBe(false);
  });
  it("es falso si ningún producto tiene delivery gratis", () => {
    expect(entregaGratis([{ tipo: "producto", deliveryHuancayo: false }, { tipo: "producto" }])).toBe(false);
  });
  it("es verdadero si al menos un producto lo tiene (carrito mezclado)", () => {
    expect(
      entregaGratis([
        { tipo: "producto", deliveryHuancayo: false },
        { tipo: "producto", deliveryHuancayo: true },
        { tipo: "producto" },
      ]),
    ).toBe(true);
  });
  it("las promociones nunca cuentan, aunque traigan el campo", () => {
    expect(entregaGratis([{ tipo: "promocion", deliveryHuancayo: true }])).toBe(false);
    expect(entregaGratis([{ tipo: "promocion" }, { tipo: "promocion" }])).toBe(false);
  });
  it("promoción + producto con delivery gratis: gratis", () => {
    expect(entregaGratis([{ tipo: "promocion" }, { tipo: "producto", deliveryHuancayo: true }])).toBe(true);
  });
  it("solo cuenta el valor verdadero (null y undefined no)", () => {
    expect(entregaGratis([{ tipo: "producto", deliveryHuancayo: null }])).toBe(false);
    expect(entregaGratis([{ tipo: "producto", deliveryHuancayo: undefined }])).toBe(false);
  });
});
