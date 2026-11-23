import { describe, expect, it } from "vitest";
import { IDS_PERU, escalaDeColor, idDeRegionPeru, normalizarNombre, radioMarcador, ubicarEnMapa } from "@/lib/mapas";
import peru from "@/app/(admin)/admin/estadisticas/_mapas/peru.json";
import mundo from "@/app/(admin)/admin/estadisticas/_mapas/mundo.json";

describe("normalizarNombre", () => {
  it("quita tildes, mayúsculas y signos", () => {
    expect(normalizarNombre("Junín")).toBe("junin");
    expect(normalizarNombre("  Áncash ")).toBe("ancash");
    expect(normalizarNombre("San-Martín")).toBe("san martin");
    expect(normalizarNombre("Madre  de   Dios")).toBe("madre de dios");
  });
});

describe("idDeRegionPeru", () => {
  it("con y sin tilde", () => {
    expect(idDeRegionPeru("Junin")).toBe("PE-JUN");
    expect(idDeRegionPeru("Junín")).toBe("PE-JUN");
    expect(idDeRegionPeru("Huanuco")).toBe("PE-HUC");
    expect(idDeRegionPeru("Apurímac")).toBe("PE-APU");
    expect(idDeRegionPeru("San Martin")).toBe("PE-SAM");
    expect(idDeRegionPeru("Cuzco")).toBe("PE-CUS");
  });

  it("Lima: «Lima» es Lima Metropolitana y «Lima Region», las provincias (Q4)", () => {
    expect(idDeRegionPeru("Lima")).toBe("PE-LMA");
    expect(idDeRegionPeru("Lima Region")).toBe("PE-LIM");
    expect(idDeRegionPeru("Región Lima")).toBe("PE-LIM");
    expect(idDeRegionPeru("Lima Province")).toBe("PE-LMA");
    expect(idDeRegionPeru("Metropolitan Municipality of Lima")).toBe("PE-LMA");
    expect(idDeRegionPeru("Municipalidad Metropolitana de Lima")).toBe("PE-LMA");
  });

  it("Callao con sus variantes", () => {
    expect(idDeRegionPeru("Callao")).toBe("PE-CAL");
    expect(idDeRegionPeru("Callao Region")).toBe("PE-CAL");
    expect(idDeRegionPeru("El Callao")).toBe("PE-CAL");
    expect(idDeRegionPeru("Provincia Constitucional del Callao")).toBe("PE-CAL");
    expect(idDeRegionPeru("Constitutional Province of Callao")).toBe("PE-CAL");
  });

  it("quita «Region» y «Department» sin romper nombres con «de»", () => {
    expect(idDeRegionPeru("Cusco Region")).toBe("PE-CUS");
    expect(idDeRegionPeru("Department of Piura")).toBe("PE-PIU");
    expect(idDeRegionPeru("Departamento de Madre de Dios")).toBe("PE-MDD");
    expect(idDeRegionPeru("Madre de Dios")).toBe("PE-MDD");
    expect(idDeRegionPeru("La Libertad")).toBe("PE-LAL");
  });

  it("desconocida o vacía → null", () => {
    expect(idDeRegionPeru("(not set)")).toBeNull();
    expect(idDeRegionPeru("")).toBeNull();
    expect(idDeRegionPeru("Region")).toBeNull();
    expect(idDeRegionPeru("Buenos Aires")).toBeNull();
  });
});

describe("ubicarEnMapa", () => {
  const ids = new Set(IDS_PERU);

  it("suma las claves que caen en la misma forma", () => {
    const r = ubicarEnMapa(
      [
        { clave: "Junin", usuarios: 10 },
        { clave: "Junín Region", usuarios: 2 },
        { clave: "Lima", usuarios: 5 },
      ],
      idDeRegionPeru,
      ids,
    );
    expect(r.porId).toEqual({ "PE-JUN": 12, "PE-LMA": 5 });
    expect(r.sinUbicar).toEqual([]);
  });

  it("lo desconocido va a «Sin ubicar» y los totales cuadran", () => {
    const filas = [
      { clave: "Junin", usuarios: 7 },
      { clave: "(not set)", usuarios: 3 },
      { clave: "Atlantis", usuarios: 4 },
      { clave: "Atlantis", usuarios: 1 },
    ];
    const r = ubicarEnMapa(filas, idDeRegionPeru, ids);
    expect(r.sinUbicar).toEqual([
      { clave: "Atlantis", usuarios: 5 },
      { clave: "(not set)", usuarios: 3 },
    ]);
    const total = Object.values(r.porId).reduce((s, v) => s + v, 0) + r.sinUbicar.reduce((s, v) => s + v.usuarios, 0);
    expect(total).toBe(15);
  });

  it("países: un código que no está en el mapa o vacío va a «Sin ubicar»", () => {
    const r = ubicarEnMapa(
      [
        { clave: "PE", usuarios: 9 },
        { clave: "SG", usuarios: 2 },
        { clave: "", usuarios: 1 },
      ],
      (c) => c || null,
      new Set(["PE", "US"]),
    );
    expect(r.porId).toEqual({ PE: 9 });
    expect(r.sinUbicar.map((x) => x.clave)).toEqual(["SG", ""]);
  });

  it("ignora filas sin usuarios", () => {
    const r = ubicarEnMapa([{ clave: "Junin", usuarios: 0 }, { clave: "Atlantis", usuarios: 0 }], idDeRegionPeru, ids);
    expect(r).toEqual({ porId: {}, sinUbicar: [] });
  });
});

describe("escalaDeColor", () => {
  it("sin valores o sin visitas → 0", () => {
    expect(escalaDeColor([])(5)).toBe(0);
    expect(escalaDeColor([3, 4])(0)).toBe(0);
    expect(escalaDeColor([0, 0])(0)).toBe(0);
  });

  it("un solo valor → el escalón más fuerte", () => {
    expect(escalaDeColor([42])(42)).toBe(5);
  });

  it("muchos valores: crece con el valor y el mayor tiene el escalón más fuerte", () => {
    const valores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const escala = escalaDeColor(valores);
    const escalones = valores.map(escala);
    expect(escalones).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(escalaDeColor([1, 1000])(1)).toBe(3);
    expect(escalaDeColor([1, 1000])(1000)).toBe(5);
  });

  it("empates en el mismo escalón y valores intermedios", () => {
    const escala = escalaDeColor([5, 5, 5, 100]);
    expect(escala(5)).toBe(4);
    expect(escala(100)).toBe(5);
    expect(escala(1)).toBe(1);
  });

  it("otro número de pasos", () => expect(escalaDeColor([1, 2, 3], 3)(2)).toBe(2));
});

describe("radioMarcador", () => {
  it("0 usuarios → sin marcador", () => expect(radioMarcador(0, 100)).toBe(0));
  it("el mayor → radio máximo", () => expect(radioMarcador(100, 100)).toBe(12));
  it("un solo valor → radio máximo", () => expect(radioMarcador(1, 1)).toBe(12));
  it("crece con la raíz y nunca baja del mínimo", () => {
    expect(radioMarcador(25, 100)).toBe(8);
    expect(radioMarcador(1, 10_000)).toBe(4.1);
    const radios = [1, 10, 100, 1000].map((v) => radioMarcador(v, 1000));
    expect(radios).toEqual([...radios].sort((a, b) => a - b));
  });
  it("mayor inválido → mínimo", () => expect(radioMarcador(5, 0)).toBe(4));
  it("límites propios", () => expect(radioMarcador(100, 100, 2, 6)).toBe(6));
});

describe("geometría generada", () => {
  it("el mapa del Perú tiene exactamente los ids de la tabla de alias", () => {
    expect(peru.formas.map((f) => f.id).sort()).toEqual([...IDS_PERU]);
    expect(IDS_PERU).toHaveLength(26);
  });

  it("cada forma tiene trazo y su marcador cae dentro del dibujo", () => {
    for (const m of [peru, mundo]) {
      for (const f of m.formas) {
        expect(f.d.startsWith("M")).toBe(true);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x).toBeLessThanOrEqual(m.ancho);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeLessThanOrEqual(m.alto);
      }
    }
  });

  it("el mundo usa códigos ISO de 2 letras únicos, con Francia y Noruega, sin la Antártida", () => {
    const ids = mundo.formas.map((f) => f.id).filter(Boolean);
    expect(ids.every((id) => /^[A-Z]{2}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["PE", "FR", "NO", "US"]));
    expect(ids).not.toContain("AQ");
  });

  it("Huancayo cae dentro de Junín en el mapa del Perú y cerca de Perú en el del mundo", () => {
    const junin = peru.formas.find((f) => f.id === "PE-JUN");
    expect(junin).toBeDefined();
    const [hx, hy] = peru.huancayo;
    expect(Math.hypot(hx - (junin?.x ?? 0), hy - (junin?.y ?? 0))).toBeLessThan(80);
    const pe = mundo.formas.find((f) => f.id === "PE");
    const [wx, wy] = mundo.huancayo;
    expect(Math.hypot(wx - (pe?.x ?? 0), wy - (pe?.y ?? 0))).toBeLessThan(30);
  });
});
