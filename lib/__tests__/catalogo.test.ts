import { describe, expect, it } from "vitest";
import { MAX_IDS_CATALOGO, idsParaCatalogo } from "@/lib/catalogo";

const id = (n: number) => n.toString(16).padStart(24, "0");

describe("idsParaCatalogo", () => {
  it("vacío", () => expect(idsParaCatalogo([])).toBe(""));
  it("une repetidos (variantes del mismo producto) y ordena", () =>
    expect(idsParaCatalogo([{ _id: id(2) }, { _id: id(1), tipo: "producto" }, { _id: id(2) }])).toBe(`${id(1)},${id(2)}`));
  it("ignora promociones e ids inválidos", () =>
    expect(idsParaCatalogo([{ _id: id(3), tipo: "promocion" }, { _id: "abc" }, { _id: id(4) }])).toBe(id(4)));
  it(`máximo ${MAX_IDS_CATALOGO}`, () =>
    expect(idsParaCatalogo(Array.from({ length: 150 }, (_, i) => ({ _id: id(i + 1) }))).split(",")).toHaveLength(MAX_IDS_CATALOGO));
});
