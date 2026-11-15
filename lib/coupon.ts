import type { CouponMotivo } from "@/types";

// Reglas de validez de un cupón (D-40, D-43, D-44). Funciones puras: sin base de datos ni fechas implícitas.

export type { CouponMotivo };

export type CuponEvaluable = {
  activo: boolean;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  usosMaximos?: number | null;
  usosActuales: number;
  usosPorCliente: number;
  montoMinimo: number;
};

/** Únicos textos que ve el cliente: no distinguen inexistente, inactivo, vencido o agotado (D-43). */
export const MENSAJES_CUPON: Record<CouponMotivo, string> = {
  no_valido: "Este cupón no es válido.",
  ya_usado: "Ya usaste este cupón.",
  no_alcanza_minimo: "Tu compra aún no alcanza el mínimo para este cupón.",
};

/** trim + mayúsculas + sin espacios internos (D-44). */
export function normalizarCodigo(entrada: string): string {
  return entrada.replace(/\s+/g, "").toUpperCase();
}

function aMs(f: string | Date | null | undefined): number | null {
  if (f === null || f === undefined || f === "") return null;
  const ms = (f instanceof Date ? f : new Date(f)).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** El primero que falla decide: activo → inicio → fin → usos totales → usos del cliente → mínimo. */
export function evaluarCupon(
  c: CuponEvaluable,
  ctx: { subtotal: number; ahora: Date; usosDelCliente: number },
): { valido: true } | { valido: false; motivo: CouponMotivo } {
  const ahora = ctx.ahora.getTime();
  if (!c.activo) return { valido: false, motivo: "no_valido" };

  const inicio = aMs(c.fechaInicio);
  if (inicio !== null && inicio > ahora) return { valido: false, motivo: "no_valido" };

  const fin = aMs(c.fechaFin);
  if (fin !== null && fin < ahora) return { valido: false, motivo: "no_valido" };

  if (c.usosMaximos != null && c.usosActuales >= c.usosMaximos) return { valido: false, motivo: "no_valido" };
  if (ctx.usosDelCliente >= c.usosPorCliente) return { valido: false, motivo: "ya_usado" };
  if (ctx.subtotal < c.montoMinimo) return { valido: false, motivo: "no_alcanza_minimo" };
  return { valido: true };
}
