import { describe, expect, it } from "vitest";
import {
  calcularSubtotal,
  calcularTotales,
  descuentoDeCupon,
  descuentoDeNivel,
  elegirNivel,
  proximoNivel,
} from "@/lib/pricing";
import { redondear2 } from "@/lib/money";
import type { CuponAplicable, DiscountTier } from "@/types";

const nivel = (montoMinimo: number, tipoDescuento: DiscountTier["tipoDescuento"], valorDescuento: number, activo = true): DiscountTier => ({
  _id: `n${montoMinimo}`,
  nombre: `Nivel ${montoMinimo}`,
  montoMinimo,
  tipoDescuento,
  valorDescuento,
  activo,
});

const cupon = (c: Partial<CuponAplicable> = {}): CuponAplicable => ({
  codigo: "PRUEBA",
  tipo: "porcentaje",
  valor: 10,
  topeDescuento: null,
  montoMinimo: 0,
  acumulable: false,
  ...c,
});

const N100_10 = nivel(100, "porcentaje", 10);
const N200_15 = nivel(200, "porcentaje", 15);
const NIVELES = [N100_10, N200_15];

describe("calcularSubtotal", () => {
  it("[{10.10, 3}, {0.20, 1}] = 30.50 (sin error de coma flotante)", () => {
    expect(calcularSubtotal([{ precio: 10.1, cantidad: 3 }, { precio: 0.2, cantidad: 1 }])).toBe(30.5);
  });
  it("carrito vacío = 0", () => expect(calcularSubtotal([])).toBe(0));
});

describe("elegirNivel / descuentoDeNivel", () => {
  it("99.99 → sin nivel", () => {
    expect(elegirNivel(NIVELES, 99.99)).toBeNull();
    expect(descuentoDeNivel(null, 99.99)).toBe(0);
  });
  it("100 → nivel de 100, descuento 10.00 (el mínimo es inclusivo)", () => {
    expect(elegirNivel(NIVELES, 100)).toBe(N100_10);
    expect(descuentoDeNivel(N100_10, 100)).toBe(10);
  });
  it("250 → gana el de mayor monto mínimo (200), descuento 37.50", () => {
    const n = elegirNivel(NIVELES, 250);
    expect(n).toBe(N200_15);
    expect(descuentoDeNivel(n, 250)).toBe(37.5);
  });
  it("el orden de la lista no importa", () => {
    expect(elegirNivel([N200_15, N100_10], 250)).toBe(N200_15);
  });
  it("un nivel inactivo se ignora", () => {
    const inactivo = nivel(200, "porcentaje", 50, false);
    expect(elegirNivel([N100_10, inactivo], 250)).toBe(N100_10);
    expect(elegirNivel([inactivo], 250)).toBeNull();
  });
  it("monto_fijo de 50 con subtotal 30 → descuento 30 (nunca más que el subtotal)", () => {
    const fijo = nivel(0, "monto_fijo", 50);
    expect(descuentoDeNivel(fijo, 30)).toBe(30);
  });
  it("monto_fijo de 50 con subtotal 30 → total 0", () => {
    const t = calcularTotales({ lineas: [{ precio: 30, cantidad: 1 }], niveles: [nivel(0, "monto_fijo", 50)] });
    expect(t.descuentoTotal).toBe(30);
    expect(t.total).toBe(0);
  });
  it("el porcentaje se redondea a 2 decimales", () => {
    expect(descuentoDeNivel(nivel(0, "porcentaje", 7), 33.33)).toBe(2.33);
  });
});

describe("proximoNivel", () => {
  it("subtotal 80 → nivel de 100, falta 20", () => {
    expect(proximoNivel(NIVELES, 80)).toEqual({ nivel: N100_10, falta: 20 });
  });
  it("subtotal 300 → null", () => {
    expect(proximoNivel(NIVELES, 300)).toBeNull();
  });
  it("subtotal 150 → nivel de 200, falta 50", () => {
    expect(proximoNivel(NIVELES, 150)).toEqual({ nivel: N200_15, falta: 50 });
  });
  it("con subtotal exactamente igual al mínimo, ese nivel ya no es el próximo", () => {
    expect(proximoNivel(NIVELES, 100)?.nivel).toBe(N200_15);
  });
  it("ignora niveles inactivos", () => {
    expect(proximoNivel([nivel(100, "porcentaje", 10, false)], 50)).toBeNull();
  });
});

describe("descuentoDeCupon", () => {
  it("20 % con tope 15 sobre 100 → 15", () => {
    expect(descuentoDeCupon(cupon({ valor: 20, topeDescuento: 15 }), 100)).toBe(15);
  });
  it("20 % sin tope sobre 100 → 20", () => {
    expect(descuentoDeCupon(cupon({ valor: 20 }), 100)).toBe(20);
  });
  it("con montoMinimo 150 sobre 100 → 0", () => {
    expect(descuentoDeCupon(cupon({ valor: 20, montoMinimo: 150 }), 100)).toBe(0);
  });
  it("monto_fijo no supera la base", () => {
    expect(descuentoDeCupon(cupon({ tipo: "monto_fijo", valor: 50 }), 30)).toBe(30);
  });
});

describe("calcularTotales · sin cupón", () => {
  it("sin nivel → ninguno", () => {
    const t = calcularTotales({ lineas: [{ precio: 50, cantidad: 1 }], niveles: NIVELES });
    expect(t).toMatchObject({ subtotal: 50, nivel: null, descuentoNivel: 0, descuentoCupon: 0, aplicado: "ninguno", descuentoTotal: 0, costoEnvio: 0, total: 50 });
  });
  it("con nivel → nivel", () => {
    const t = calcularTotales({ lineas: [{ precio: 250, cantidad: 1 }], niveles: NIVELES });
    expect(t).toMatchObject({ subtotal: 250, nivel: N200_15, descuentoNivel: 37.5, aplicado: "nivel", descuentoTotal: 37.5, total: 212.5 });
  });
});

describe("calcularTotales · cupón NO acumulable", () => {
  const lineas = [{ precio: 100, cantidad: 1 }];

  it("nivel da 10, cupón da 15 → gana el cupón", () => {
    const t = calcularTotales({ lineas, niveles: NIVELES, cupon: cupon({ tipo: "monto_fijo", valor: 15 }) });
    expect(t.descuentoNivel).toBe(10);
    expect(t.descuentoCupon).toBe(15);
    expect(t.aplicado).toBe("cupon");
    expect(t.descuentoTotal).toBe(15);
    expect(t.total).toBe(85);
  });
  it("nivel da 15, cupón da 15 → empate: gana el nivel", () => {
    const t = calcularTotales({ lineas, niveles: [nivel(100, "porcentaje", 15)], cupon: cupon({ tipo: "monto_fijo", valor: 15 }) });
    expect(t.descuentoNivel).toBe(15);
    expect(t.descuentoCupon).toBe(15);
    expect(t.aplicado).toBe("nivel");
    expect(t.descuentoTotal).toBe(15);
  });
  it("nivel mayor que el cupón → nivel; el cupón informa lo que daría", () => {
    const t = calcularTotales({ lineas, niveles: [nivel(100, "porcentaje", 20)], cupon: cupon({ tipo: "monto_fijo", valor: 5 }) });
    expect(t.aplicado).toBe("nivel");
    expect(t.descuentoCupon).toBe(5);
    expect(t.descuentoTotal).toBe(20);
  });
  it("sin nivel y con cupón → cupón", () => {
    const t = calcularTotales({ lineas, niveles: [], cupon: cupon({ valor: 10 }) });
    expect(t).toMatchObject({ nivel: null, descuentoNivel: 0, descuentoCupon: 10, aplicado: "cupon", descuentoTotal: 10, total: 90 });
  });
  it("cupón que no llega a su mínimo y sin nivel → ninguno", () => {
    const t = calcularTotales({ lineas, niveles: [], cupon: cupon({ montoMinimo: 150 }) });
    expect(t).toMatchObject({ descuentoCupon: 0, aplicado: "ninguno", descuentoTotal: 0, total: 100 });
  });
});

describe("calcularTotales · cupón acumulable", () => {
  it("subtotal 200, nivel 10 % (20), cupón 10 % sobre 180 = 18 → total descuento 38, «ambos»", () => {
    const t = calcularTotales({
      lineas: [{ precio: 200, cantidad: 1 }],
      niveles: [nivel(100, "porcentaje", 10)],
      cupon: cupon({ valor: 10, acumulable: true }),
    });
    expect(t.descuentoNivel).toBe(20);
    expect(t.descuentoCupon).toBe(18);
    expect(t.aplicado).toBe("ambos");
    expect(t.descuentoTotal).toBe(38);
    expect(t.total).toBe(162);
  });
  it("el montoMinimo del cupón se evalúa contra el subtotal ORIGINAL, no contra el restante", () => {
    // subtotal 200, nivel 10 % → restante 180. Mínimo 190: pasa por el original (200) aunque 180 < 190.
    const t = calcularTotales({
      lineas: [{ precio: 200, cantidad: 1 }],
      niveles: [nivel(100, "porcentaje", 10)],
      cupon: cupon({ valor: 10, acumulable: true, montoMinimo: 190 }),
    });
    expect(t.descuentoCupon).toBe(18);
    expect(t.aplicado).toBe("ambos");
  });
  it("acumulable pero sin nivel → solo cupón", () => {
    const t = calcularTotales({ lineas: [{ precio: 100, cantidad: 1 }], niveles: [], cupon: cupon({ valor: 10, acumulable: true }) });
    expect(t).toMatchObject({ descuentoNivel: 0, descuentoCupon: 10, aplicado: "cupon", descuentoTotal: 10 });
  });
});

describe("calcularTotales · límites y envío", () => {
  it("el total nunca es negativo (porcentaje mal guardado > 100)", () => {
    const t = calcularTotales({ lineas: [{ precio: 40, cantidad: 1 }], niveles: [nivel(0, "porcentaje", 150)] });
    expect(t.descuentoNivel).toBe(40); // el descuento informado también se limita al subtotal
    expect(t.descuentoTotal).toBe(40);
    expect(t.total).toBe(0);
  });
  it("acumulable: nivel + cupón nunca superan el subtotal", () => {
    const t = calcularTotales({
      lineas: [{ precio: 100, cantidad: 1 }],
      niveles: [nivel(0, "monto_fijo", 80)],
      cupon: cupon({ tipo: "monto_fijo", valor: 80, acumulable: true }),
    });
    expect(t.descuentoNivel).toBe(80);
    expect(t.descuentoCupon).toBe(20); // el cupón solo puede descontar lo que queda (100 − 80)
    expect(t.descuentoTotal).toBe(100);
    expect(t.total).toBe(0);
  });
  it("costoEnvio 12 se suma al final", () => {
    const t = calcularTotales({ lineas: [{ precio: 100, cantidad: 1 }], niveles: NIVELES, costoEnvio: 12 });
    expect(t.costoEnvio).toBe(12);
    expect(t.descuentoTotal).toBe(10);
    expect(t.total).toBe(102);
  });
  it("el envío se suma aunque el descuento deje la compra en 0", () => {
    const t = calcularTotales({ lineas: [{ precio: 30, cantidad: 1 }], niveles: [nivel(0, "monto_fijo", 50)], costoEnvio: 12 });
    expect(t.total).toBe(12);
  });
  it("todas las salidas salen redondeadas a 2 decimales", () => {
    const t = calcularTotales({ lineas: [{ precio: 10.1, cantidad: 3 }, { precio: 0.2, cantidad: 1 }], niveles: [nivel(0, "porcentaje", 10)] });
    for (const v of [t.subtotal, t.descuentoNivel, t.descuentoCupon, t.descuentoTotal, t.costoEnvio, t.total]) {
      expect(Number(v.toFixed(2))).toBe(v);
    }
    expect(t.subtotal).toBe(30.5);
    expect(t.descuentoNivel).toBe(3.05); // 30.5 × 10 / 100
    expect(t.total).toBe(27.45);
  });
});

// ── Casos añadidos tras la revisión (decisiones del dueño) ──────────────────────────────

describe("descuentoDeNivel · límites", () => {
  it("porcentaje > 100 se limita al subtotal también en descuentoDeNivel", () => {
    expect(descuentoDeNivel(nivel(0, "porcentaje", 150), 40)).toBe(40);
  });
});

describe("elegirNivel · casos límite", () => {
  it("dos niveles con el mismo montoMinimo: gana el primero de la lista (como hoy)", () => {
    const a = nivel(100, "porcentaje", 10);
    const b = nivel(100, "porcentaje", 20);
    expect(elegirNivel([a, b], 150)).toBe(a);
    expect(elegirNivel([b, a], 150)).toBe(b);
  });
  it("subtotal que sale 30.499999999999996 de sumar decimales alcanza un nivel de 30.50", () => {
    // Hoy ese carrito NO recibía el descuento aunque la pantalla dijera «S/ 30.50»; se corrige.
    const lineas = [{ precio: 10.1, cantidad: 3 }, { precio: 0.2, cantidad: 1 }];
    const t = calcularTotales({ lineas, niveles: [nivel(30.5, "monto_fijo", 5)] });
    expect(t.subtotal).toBe(30.5);
    expect(t.aplicado).toBe("nivel");
    expect(t.total).toBe(25.5);
  });
});

describe("redondeo · medio centavo (D-10: redondear2; +0.01 respecto a toFixed en estos empates)", () => {
  it("10 % de 10.35 → descuento 1.04, total 9.31", () => {
    const t = calcularTotales({ lineas: [{ precio: 10.35, cantidad: 1 }], niveles: [nivel(0, "porcentaje", 10)] });
    expect(t.descuentoNivel).toBe(1.04);
    expect(t.total).toBe(9.31);
  });
  it("10 % de 10.75 → descuento 1.08, total 9.67 (descuento + total = subtotal)", () => {
    const t = calcularTotales({ lineas: [{ precio: 10.75, cantidad: 1 }], niveles: [nivel(0, "porcentaje", 10)] });
    expect(t.descuentoNivel).toBe(1.08);
    expect(t.total).toBe(9.67);
    expect(redondear2(t.descuentoTotal + t.total)).toBe(t.subtotal);
  });
});

describe("proximoNivel · redondeo y subtotal 0", () => {
  it("falta redondeado a 2 decimales", () => {
    expect(proximoNivel([nivel(100, "porcentaje", 10)], 99.9)?.falta).toBe(0.1);
  });
  it("subtotal 0 → el primer nivel, falta = su monto mínimo", () => {
    expect(proximoNivel(NIVELES, 0)).toEqual({ nivel: N100_10, falta: 100 });
  });
});

describe("descuentoDeCupon · topes y límites", () => {
  it("topeDescuento 0 equivale a «sin tope» (igual que null)", () => {
    expect(descuentoDeCupon(cupon({ valor: 20, topeDescuento: 0 }), 100)).toBe(20);
  });
  it("topeDescuento undefined = sin tope", () => {
    expect(descuentoDeCupon(cupon({ valor: 20, topeDescuento: undefined }), 100)).toBe(20);
  });
  it("porcentaje > 100 se limita a la base", () => {
    expect(descuentoDeCupon(cupon({ valor: 150 }), 40)).toBe(40);
  });
  it("el mínimo es inclusivo", () => {
    expect(descuentoDeCupon(cupon({ valor: 10, montoMinimo: 100 }), 100)).toBe(10);
  });
});

describe("calcularTotales · más casos de cupón", () => {
  it("tope del cupón dentro de calcularTotales: 50 % tope 15 sobre 100 con nivel de 10 → gana el cupón con 15", () => {
    const t = calcularTotales({ lineas: [{ precio: 100, cantidad: 1 }], niveles: NIVELES, cupon: cupon({ valor: 50, topeDescuento: 15 }) });
    expect(t.descuentoCupon).toBe(15);
    expect(t.aplicado).toBe("cupon");
    expect(t.total).toBe(85);
  });
  it("empate con valores casi iguales en coma flotante: se compara ya redondeado → gana el nivel", () => {
    // 33.3 × 10 / 100 = 3.33 (con ruido de coma flotante) frente a un cupón fijo de 3.33
    const t = calcularTotales({ lineas: [{ precio: 33.3, cantidad: 1 }], niveles: [nivel(0, "porcentaje", 10)], cupon: cupon({ tipo: "monto_fijo", valor: 3.33 }) });
    expect(t.descuentoNivel).toBe(3.33);
    expect(t.descuentoCupon).toBe(3.33);
    expect(t.aplicado).toBe("nivel");
  });
  it("acumulable cuyo mínimo NO se cumple con el subtotal original → cupón 0 y «nivel»", () => {
    const t = calcularTotales({
      lineas: [{ precio: 200, cantidad: 1 }],
      niveles: [nivel(100, "porcentaje", 10)],
      cupon: cupon({ valor: 10, acumulable: true, montoMinimo: 250 }),
    });
    expect(t.descuentoCupon).toBe(0);
    expect(t.aplicado).toBe("nivel");
    expect(t.descuentoTotal).toBe(20);
  });
  it("cupón porcentual > 100 acumulable no deja el total negativo", () => {
    const t = calcularTotales({ lineas: [{ precio: 100, cantidad: 1 }], niveles: [nivel(0, "porcentaje", 10)], cupon: cupon({ valor: 150, acumulable: true }) });
    expect(t.descuentoTotal).toBe(100);
    expect(t.total).toBe(0);
  });
});
