export const ORDER_ESTADOS = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"] as const;
export type OrderEstado = (typeof ORDER_ESTADOS)[number];

export const TRANSICIONES: Record<OrderEstado, readonly OrderEstado[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "entregado", "cancelado"],
  enviado: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

export function puedeTransicionar(de: OrderEstado, a: OrderEstado): boolean {
  return TRANSICIONES[de].includes(a);
}

const ETIQUETAS: Record<OrderEstado, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function etiquetaEstado(e: OrderEstado): string {
  return ETIQUETAS[e];
}
