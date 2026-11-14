import { redondear2 } from "@/lib/money";
import type { CuponAplicable, DiscountTier } from "@/types";

// Reglas de precio compartidas por el navegador y el servidor (D-37, D-39). Funciones puras.

export type Linea = { precio: number; cantidad: number };
export type Totales = {
  subtotal: number;
  nivel: DiscountTier | null; // nivel de descuento por monto que corresponde al subtotal
  descuentoNivel: number; // lo que descontaría el nivel
  descuentoCupon: number; // lo que descontaría el cupón
  aplicado: "ninguno" | "nivel" | "cupon" | "ambos";
  descuentoTotal: number;
  costoEnvio: number;
  total: number;
};

export function calcularSubtotal(lineas: Linea[]): number {
  return redondear2(lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0));
}

/** Entre los niveles activos cuyo mínimo se alcanza, el de mayor montoMinimo (en empate, el primero de la lista). */
export function elegirNivel(niveles: DiscountTier[], subtotal: number): DiscountTier | null {
  let mejor: DiscountTier | null = null;
  for (const n of niveles) {
    if (n.activo !== true || subtotal < n.montoMinimo) continue;
    if (mejor === null || n.montoMinimo > mejor.montoMinimo) mejor = n;
  }
  return mejor;
}

export function descuentoDeNivel(nivel: DiscountTier | null, subtotal: number): number {
  if (!nivel) return 0;
  const bruto = nivel.tipoDescuento === "porcentaje" ? (subtotal * nivel.valorDescuento) / 100 : nivel.valorDescuento;
  return redondear2(Math.max(0, Math.min(bruto, subtotal)));
}

/** Siguiente nivel activo que aún no se alcanza y cuánto falta. */
export function proximoNivel(niveles: DiscountTier[], subtotal: number): { nivel: DiscountTier; falta: number } | null {
  let siguiente: DiscountTier | null = null;
  for (const n of niveles) {
    if (n.activo !== true || subtotal >= n.montoMinimo) continue;
    if (siguiente === null || n.montoMinimo < siguiente.montoMinimo) siguiente = n;
  }
  return siguiente ? { nivel: siguiente, falta: redondear2(siguiente.montoMinimo - subtotal) } : null;
}

function calcularCupon(cupon: CuponAplicable, base: number): number {
  let bruto = cupon.tipo === "porcentaje" ? (base * cupon.valor) / 100 : cupon.valor;
  // topeDescuento null, undefined o 0 = sin tope
  if (cupon.tipo === "porcentaje" && typeof cupon.topeDescuento === "number" && cupon.topeDescuento > 0) {
    bruto = Math.min(bruto, cupon.topeDescuento);
  }
  return redondear2(Math.max(0, Math.min(bruto, base)));
}

export function descuentoDeCupon(cupon: CuponAplicable, base: number): number {
  if (base < cupon.montoMinimo) return 0;
  return calcularCupon(cupon, base);
}

export function calcularTotales(args: {
  lineas: Linea[];
  niveles: DiscountTier[];
  cupon?: CuponAplicable | null;
  costoEnvio?: number;
}): Totales {
  const subtotal = calcularSubtotal(args.lineas);
  const costoEnvio = redondear2(args.costoEnvio ?? 0);
  const nivel = elegirNivel(args.niveles, subtotal);
  const descuentoNivel = descuentoDeNivel(nivel, subtotal);
  const cupon = args.cupon ?? null;

  let descuentoCupon = 0;
  let descuentoTotal = descuentoNivel;
  let aplicado: Totales["aplicado"] = descuentoNivel > 0 ? "nivel" : "ninguno";

  if (cupon) {
    if (cupon.acumulable) {
      // El mínimo del cupón se evalúa contra el subtotal ORIGINAL; el descuento, sobre lo que queda.
      descuentoCupon = subtotal < cupon.montoMinimo ? 0 : calcularCupon(cupon, redondear2(subtotal - descuentoNivel));
      descuentoTotal = descuentoNivel + descuentoCupon;
      aplicado = descuentoNivel > 0 && descuentoCupon > 0 ? "ambos" : descuentoNivel > 0 ? "nivel" : descuentoCupon > 0 ? "cupon" : "ninguno";
    } else {
      descuentoCupon = descuentoDeCupon(cupon, subtotal);
      if (descuentoCupon > descuentoNivel) {
        descuentoTotal = descuentoCupon;
        aplicado = "cupon";
      } // en empate gana el nivel
    }
  }

  descuentoTotal = redondear2(Math.min(descuentoTotal, subtotal));
  return {
    subtotal,
    nivel,
    descuentoNivel,
    descuentoCupon,
    aplicado,
    descuentoTotal,
    costoEnvio,
    total: redondear2(subtotal - descuentoTotal + costoEnvio),
  };
}
