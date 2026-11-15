import { describe, expect, it } from "vitest";
import { MENSAJES_CUPON, evaluarCupon, normalizarCodigo, type CuponEvaluable } from "@/lib/coupon";

const AHORA = new Date("2026-11-14T15:00:00.000Z");

const cupon = (c: Partial<CuponEvaluable> = {}): CuponEvaluable => ({
  activo: true,
  fechaInicio: null,
  fechaFin: null,
  usosMaximos: null,
  usosActuales: 0,
  usosPorCliente: 1,
  montoMinimo: 0,
  ...c,
});

const ctx = (c: Partial<{ subtotal: number; ahora: Date; usosDelCliente: number }> = {}) => ({
  subtotal: 100,
  ahora: AHORA,
  usosDelCliente: 0,
  ...c,
});

describe("normalizarCodigo", () => {
  it("quita espacios (también internos) y pasa a mayúsculas", () => {
    expect(normalizarCodigo(" promo 10 ")).toBe("PROMO10");
  });
  it("conserva guiones y quita tabulaciones", () => {
    expect(normalizarCodigo("\tblack-friday\n")).toBe("BLACK-FRIDAY");
  });
});

describe("evaluarCupon", () => {
  it("cupón activo, sin fechas ni límites → válido", () => {
    expect(evaluarCupon(cupon(), ctx())).toEqual({ valido: true });
  });

  it("inactivo → no_valido", () => {
    expect(evaluarCupon(cupon({ activo: false }), ctx())).toEqual({ valido: false, motivo: "no_valido" });
  });

  it("fechaInicio en el futuro → no_valido", () => {
    const r = evaluarCupon(cupon({ fechaInicio: new Date(AHORA.getTime() + 1000) }), ctx());
    expect(r).toEqual({ valido: false, motivo: "no_valido" });
  });

  it("fechaInicio igual a ahora → válido (frontera)", () => {
    expect(evaluarCupon(cupon({ fechaInicio: new Date(AHORA) }), ctx())).toEqual({ valido: true });
  });

  it("fechaInicio como texto ISO también se entiende", () => {
    expect(evaluarCupon(cupon({ fechaInicio: "2026-11-15T00:00:00.000Z" }), ctx())).toEqual({
      valido: false,
      motivo: "no_valido",
    });
  });

  it("fechaFin en el pasado → no_valido", () => {
    const r = evaluarCupon(cupon({ fechaFin: new Date(AHORA.getTime() - 1000) }), ctx());
    expect(r).toEqual({ valido: false, motivo: "no_valido" });
  });

  it("fechaFin igual a ahora → válido (frontera)", () => {
    expect(evaluarCupon(cupon({ fechaFin: new Date(AHORA) }), ctx())).toEqual({ valido: true });
  });

  it("usosActuales === usosMaximos → no_valido (frontera)", () => {
    const r = evaluarCupon(cupon({ usosMaximos: 2, usosActuales: 2 }), ctx());
    expect(r).toEqual({ valido: false, motivo: "no_valido" });
  });

  it("usosActuales < usosMaximos → válido", () => {
    expect(evaluarCupon(cupon({ usosMaximos: 2, usosActuales: 1 }), ctx())).toEqual({ valido: true });
  });

  it("usosMaximos null = ilimitado", () => {
    expect(evaluarCupon(cupon({ usosMaximos: null, usosActuales: 100000 }), ctx())).toEqual({ valido: true });
  });

  it("usosDelCliente === usosPorCliente → ya_usado (frontera)", () => {
    const r = evaluarCupon(cupon({ usosPorCliente: 1 }), ctx({ usosDelCliente: 1 }));
    expect(r).toEqual({ valido: false, motivo: "ya_usado" });
  });

  it("usosDelCliente < usosPorCliente → válido", () => {
    expect(evaluarCupon(cupon({ usosPorCliente: 2 }), ctx({ usosDelCliente: 1 }))).toEqual({ valido: true });
  });

  it("subtotal < montoMinimo → no_alcanza_minimo", () => {
    const r = evaluarCupon(cupon({ montoMinimo: 100 }), ctx({ subtotal: 99.99 }));
    expect(r).toEqual({ valido: false, motivo: "no_alcanza_minimo" });
  });

  it("subtotal === montoMinimo → válido (frontera)", () => {
    expect(evaluarCupon(cupon({ montoMinimo: 100 }), ctx({ subtotal: 100 }))).toEqual({ valido: true });
  });

  describe("orden de precedencia", () => {
    it("inactivo + ya usado → no_valido", () => {
      const r = evaluarCupon(cupon({ activo: false }), ctx({ usosDelCliente: 5 }));
      expect(r).toEqual({ valido: false, motivo: "no_valido" });
    });

    it("agotado + ya usado + bajo el mínimo → no_valido", () => {
      const r = evaluarCupon(
        cupon({ usosMaximos: 1, usosActuales: 1, montoMinimo: 500 }),
        ctx({ usosDelCliente: 1, subtotal: 10 }),
      );
      expect(r).toEqual({ valido: false, motivo: "no_valido" });
    });

    it("ya usado + bajo el mínimo → ya_usado", () => {
      const r = evaluarCupon(cupon({ montoMinimo: 500 }), ctx({ usosDelCliente: 1, subtotal: 10 }));
      expect(r).toEqual({ valido: false, motivo: "ya_usado" });
    });

    it("vencido + bajo el mínimo → no_valido", () => {
      const r = evaluarCupon(
        cupon({ fechaFin: new Date(AHORA.getTime() - 1), montoMinimo: 500 }),
        ctx({ subtotal: 10 }),
      );
      expect(r).toEqual({ valido: false, motivo: "no_valido" });
    });
  });
});

describe("MENSAJES_CUPON", () => {
  it("un mensaje por motivo, tal como en el plan", () => {
    expect(MENSAJES_CUPON).toEqual({
      no_valido: "Este cupón no es válido.",
      ya_usado: "Ya usaste este cupón.",
      no_alcanza_minimo: "Tu compra aún no alcanza el mínimo para este cupón.",
    });
  });
});
