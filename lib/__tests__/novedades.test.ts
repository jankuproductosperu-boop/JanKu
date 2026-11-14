import { describe, expect, it } from "vitest";
import { DIAS_NOVEDAD, esNovedad, fechaNuevoHasta } from "@/lib/novedades";

const AHORA = Date.parse("2026-11-13T12:00:00.000Z");

describe("esNovedad", () => {
  it("es novedad si la fecha es futura", () => {
    expect(esNovedad({ nuevoHasta: "2026-11-20T12:00:00.000Z" }, AHORA)).toBe(true);
  });
  it("deja de serlo cuando la fecha ya pasó", () => {
    expect(esNovedad({ nuevoHasta: "2026-11-13T11:59:59.000Z" }, AHORA)).toBe(false);
  });
  it("no es novedad exactamente en el instante límite", () => {
    expect(esNovedad({ nuevoHasta: "2026-11-13T12:00:00.000Z" }, AHORA)).toBe(false);
  });
  it("sin fecha, nulo o inválido no es novedad", () => {
    expect(esNovedad({}, AHORA)).toBe(false);
    expect(esNovedad({ nuevoHasta: null }, AHORA)).toBe(false);
    expect(esNovedad({ nuevoHasta: "no-es-fecha" }, AHORA)).toBe(false);
  });
});

describe("fechaNuevoHasta", () => {
  it("suma 7 días por defecto", () => {
    expect(DIAS_NOVEDAD).toBe(7);
    expect(fechaNuevoHasta(AHORA)).toBe("2026-11-20T12:00:00.000Z");
  });
  it("acepta otro número de días", () => {
    expect(fechaNuevoHasta(AHORA, 1)).toBe("2026-11-14T12:00:00.000Z");
  });
  it("produce una fecha que cuenta como novedad", () => {
    expect(esNovedad({ nuevoHasta: fechaNuevoHasta(AHORA) }, AHORA)).toBe(true);
  });
});
