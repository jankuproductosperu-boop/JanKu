import { describe, expect, it } from "vitest";
import { ORDER_ESTADOS, TRANSICIONES, etiquetaEstado, puedeTransicionar, type OrderEstado } from "@/lib/orderStatus";

const PERMITIDAS: Record<OrderEstado, OrderEstado[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "entregado", "cancelado"],
  enviado: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

describe("puedeTransicionar (25 combinaciones)", () => {
  for (const de of ORDER_ESTADOS) {
    for (const a of ORDER_ESTADOS) {
      const esperado = PERMITIDAS[de].includes(a);
      it(`${de} → ${a}: ${esperado}`, () => expect(puedeTransicionar(de, a)).toBe(esperado));
    }
  }
});

describe("TRANSICIONES", () => {
  it("un estado no puede pasar a sí mismo", () => {
    for (const e of ORDER_ESTADOS) expect(TRANSICIONES[e]).not.toContain(e);
  });
  it("entregado y cancelado son finales", () => {
    expect(TRANSICIONES.entregado).toHaveLength(0);
    expect(TRANSICIONES.cancelado).toHaveLength(0);
  });
});

describe("etiquetaEstado", () => {
  it("etiquetas en español", () => {
    expect(ORDER_ESTADOS.map(etiquetaEstado)).toEqual(["Pendiente", "Confirmado", "Enviado", "Entregado", "Cancelado"]);
  });
});
