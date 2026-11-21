import { describe, expect, it } from "vitest";
import { categoriasPrincipales, hijasDe, madreDe, slugsDeCategoria, validarMadre } from "@/lib/categorias";

const cats = [
  { slug: "hogar", nombre: "Hogar", activo: true, orden: 1 },
  { slug: "bano", nombre: "Baño", activo: true, orden: 2, padre: "hogar" },
  { slug: "cocina", nombre: "Cocina", activo: true, orden: 1, padre: "hogar" },
  { slug: "jardin", nombre: "Jardín", activo: false, orden: 3, padre: "hogar" },
  { slug: "juguetes", nombre: "Juguetes", activo: true, orden: 2, padre: "" },
];

describe("madreDe", () => {
  it("vacío o espacios es sin madre", () => {
    expect(madreDe({ padre: "" })).toBeNull();
    expect(madreDe({ padre: "  " })).toBeNull();
    expect(madreDe({})).toBeNull();
    expect(madreDe({ padre: "hogar" })).toBe("hogar");
  });
});

describe("hijasDe", () => {
  it("solo activas y por orden", () => {
    expect(hijasDe("hogar", cats).map((c) => c.slug)).toEqual(["cocina", "bano"]);
  });
  it("sin hijas da vacío", () => {
    expect(hijasDe("juguetes", cats)).toEqual([]);
  });
});

describe("slugsDeCategoria", () => {
  it("la madre y sus hijas activas", () => {
    expect(slugsDeCategoria("hogar", cats)).toEqual(["hogar", "cocina", "bano"]);
  });
  it("una categoría sin hijas es solo ella (igual que antes)", () => {
    expect(slugsDeCategoria("juguetes", cats)).toEqual(["juguetes"]);
    expect(slugsDeCategoria("cocina", cats)).toEqual(["cocina"]);
  });
});

describe("categoriasPrincipales", () => {
  it("quita las hijas, deja las de padre vacío", () => {
    expect(categoriasPrincipales(cats).map((c) => c.slug)).toEqual(["hogar", "juguetes"]);
  });
});

describe("validarMadre", () => {
  it("sin madre siempre vale", () => {
    expect(validarMadre("hogar", undefined, cats)).toBeNull();
    expect(validarMadre("hogar", "", cats)).toBeNull();
  });
  it("madre válida", () => {
    expect(validarMadre(null, "hogar", cats)).toBeNull();
    expect(validarMadre("juguetes", "hogar", cats)).toBeNull();
    expect(validarMadre("cocina", "hogar", cats)).toBeNull();
  });
  it("rechaza madre inexistente, ella misma, nieta y madre con hijas", () => {
    expect(validarMadre(null, "nada", cats)).toBe("NO_EXISTE");
    expect(validarMadre("hogar", "hogar", cats)).toBe("ELLA_MISMA");
    expect(validarMadre("juguetes", "cocina", cats)).toBe("MADRE_ES_HIJA");
    expect(validarMadre("hogar", "juguetes", cats)).toBe("TIENE_HIJAS");
  });
});
