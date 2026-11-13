import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("quita acentos y símbolos", () => expect(slugify("Árbol de Navidad 2×1!")).toBe("arbol-de-navidad-2-1"));
  it("cadena vacía", () => expect(slugify("")).toBe(""));
  it("solo símbolos", () => expect(slugify("!!!")).toBe(""));
});
