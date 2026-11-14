import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, construirMensajeCarrito, enlaceWhatsAppCarrito } from "@/lib/whatsapp";
import type { Totales } from "@/lib/pricing";

const texto = (link: string) => decodeURIComponent(link.split("?text=")[1] ?? "");

describe("buildWhatsAppLink", () => {
  it("sin número no hay link", () => expect(buildWhatsAppLink("", "Mochila", "/producto/x")).toBe(""));
  it("sin variante: el mensaje de siempre", () =>
    expect(texto(buildWhatsAppLink("51 999-888-777", "Mochila", "/producto/x"))).toMatch(/^Hola, estoy interesado\(a\) en: Mochila\n/));
  it("con variante: la añade al nombre", () =>
    expect(texto(buildWhatsAppLink("51999888777", "Mochila", "/producto/x", "Color: Negro"))).toMatch(
      /en: Mochila \(Color: Negro\)\n/,
    ));
  it("limpia el número", () => expect(buildWhatsAppLink("51 999-888-777", "M", "/p")).toMatch(/^https:\/\/wa\.me\/51999888777\?/));
});

// ── Mensaje del carrito (fase 14). Los textos esperados están escritos a mano a partir del
// mensaje que generan hoy CartSidebar y carrito/page.tsx (incluida la línea 🎨 de la variante):
// cualquier cambio de emoji, espacio o salto de línea debe hacer fallar estas pruebas.

const sinDescuento = (subtotal: number): Totales => ({
  subtotal,
  nivel: null,
  descuentoNivel: 0,
  descuentoCupon: 0,
  aplicado: "ninguno",
  descuentoTotal: 0,
  costoEnvio: 0,
  total: subtotal,
});

const conDescuento: Totales = {
  subtotal: 150.1,
  nivel: { _id: "n1", nombre: "Compra mayor", montoMinimo: 100, tipoDescuento: "porcentaje", valorDescuento: 10, activo: true },
  descuentoNivel: 15.01,
  descuentoCupon: 0,
  aplicado: "nivel",
  descuentoTotal: 15.01,
  costoEnvio: 0,
  total: 135.09,
};

const itemsSinVariante = [
  { nombre: "Mochila Azul", precio: 59.9, cantidad: 2 },
  { nombre: "Llavero", precio: 10.1, cantidad: 3 },
];

const itemsConVariante = [
  { nombre: "Mochila Azul", precio: 59.9, cantidad: 2, varianteEtiqueta: "Color: Negro" },
  { nombre: "Llavero", precio: 10.1, cantidad: 3 },
];

describe("construirMensajeCarrito (texto exacto)", () => {
  it("sin variante y sin descuento", () => {
    expect(construirMensajeCarrito({ items: itemsSinVariante, totales: sinDescuento(150.1) })).toBe(
      "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n" +
        "1. *Mochila Azul*\n" +
        "   💰 Precio: S/ 59.90\n" +
        "   📦 Cantidad: 2\n" +
        "   💵 Subtotal: S/ 119.80\n\n" +
        "2. *Llavero*\n" +
        "   💰 Precio: S/ 10.10\n" +
        "   📦 Cantidad: 3\n" +
        "   💵 Subtotal: S/ 30.30\n\n" +
        "Subtotal: S/ 150.10\n" +
        "*TOTAL: S/ 150.10*\n\n" +
        "Deseo comprar estos productos. ¡Gracias! 😊",
    );
  });

  it("con variante y sin descuento: la línea 🎨 va entre el nombre y el precio, solo en el ítem que la trae", () => {
    expect(construirMensajeCarrito({ items: itemsConVariante, totales: sinDescuento(150.1) })).toBe(
      "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n" +
        "1. *Mochila Azul*\n" +
        "   🎨 Color: Negro\n" +
        "   💰 Precio: S/ 59.90\n" +
        "   📦 Cantidad: 2\n" +
        "   💵 Subtotal: S/ 119.80\n\n" +
        "2. *Llavero*\n" +
        "   💰 Precio: S/ 10.10\n" +
        "   📦 Cantidad: 3\n" +
        "   💵 Subtotal: S/ 30.30\n\n" +
        "Subtotal: S/ 150.10\n" +
        "*TOTAL: S/ 150.10*\n\n" +
        "Deseo comprar estos productos. ¡Gracias! 😊",
    );
  });

  it("sin variante y con descuento", () => {
    expect(construirMensajeCarrito({ items: itemsSinVariante, totales: conDescuento })).toBe(
      "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n" +
        "1. *Mochila Azul*\n" +
        "   💰 Precio: S/ 59.90\n" +
        "   📦 Cantidad: 2\n" +
        "   💵 Subtotal: S/ 119.80\n\n" +
        "2. *Llavero*\n" +
        "   💰 Precio: S/ 10.10\n" +
        "   📦 Cantidad: 3\n" +
        "   💵 Subtotal: S/ 30.30\n\n" +
        "Subtotal: S/ 150.10\n" +
        "🎉 Descuento aplicado (Compra mayor): -S/ 15.01\n" +
        "*TOTAL: S/ 135.09*\n\n" +
        "Deseo comprar estos productos. ¡Gracias! 😊",
    );
  });

  it("con variante y con descuento", () => {
    expect(construirMensajeCarrito({ items: itemsConVariante, totales: conDescuento })).toBe(
      "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n" +
        "1. *Mochila Azul*\n" +
        "   🎨 Color: Negro\n" +
        "   💰 Precio: S/ 59.90\n" +
        "   📦 Cantidad: 2\n" +
        "   💵 Subtotal: S/ 119.80\n\n" +
        "2. *Llavero*\n" +
        "   💰 Precio: S/ 10.10\n" +
        "   📦 Cantidad: 3\n" +
        "   💵 Subtotal: S/ 30.30\n\n" +
        "Subtotal: S/ 150.10\n" +
        "🎉 Descuento aplicado (Compra mayor): -S/ 15.01\n" +
        "*TOTAL: S/ 135.09*\n\n" +
        "Deseo comprar estos productos. ¡Gracias! 😊",
    );
  });
});

describe("construirMensajeCarrito · más casos", () => {
  const cabecera = "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n";
  const pie = "Deseo comprar estos productos. ¡Gracias! 😊";

  it("varianteEtiqueta vacía: no sale la línea 🎨", () => {
    const m = construirMensajeCarrito({ items: [{ nombre: "A", precio: 1, cantidad: 1, varianteEtiqueta: "" }], totales: sinDescuento(1) });
    expect(m.includes("🎨")).toBe(false);
  });

  it("dos líneas del mismo producto con variantes distintas: dos ítems numerados", () => {
    const items = [
      { nombre: "Mochila", precio: 10, cantidad: 1, varianteEtiqueta: "Color: Negro" },
      { nombre: "Mochila", precio: 10, cantidad: 2, varianteEtiqueta: "Color: Rosado" },
    ];
    expect(construirMensajeCarrito({ items, totales: sinDescuento(30) })).toBe(
      cabecera +
        "1. *Mochila*\n   🎨 Color: Negro\n   💰 Precio: S/ 10.00\n   📦 Cantidad: 1\n   💵 Subtotal: S/ 10.00\n\n" +
        "2. *Mochila*\n   🎨 Color: Rosado\n   💰 Precio: S/ 10.00\n   📦 Cantidad: 2\n   💵 Subtotal: S/ 20.00\n\n" +
        "Subtotal: S/ 30.00\n*TOTAL: S/ 30.00*\n\n" +
        pie,
    );
  });

  it("nivel aplicado con descuento 0: la línea de descuento sale igual que hoy", () => {
    const totales: Totales = {
      ...sinDescuento(10),
      nivel: { _id: "n", nombre: "Gratis", montoMinimo: 0, tipoDescuento: "monto_fijo", valorDescuento: 0, activo: true },
    };
    expect(construirMensajeCarrito({ items: [{ nombre: "A", precio: 10, cantidad: 1 }], totales })).toBe(
      cabecera +
        "1. *A*\n   💰 Precio: S/ 10.00\n   📦 Cantidad: 1\n   💵 Subtotal: S/ 10.00\n\n" +
        "Subtotal: S/ 10.00\n🎉 Descuento aplicado (Gratis): -S/ 0.00\n*TOTAL: S/ 10.00*\n\n" +
        pie,
    );
  });

  it("nombre con caracteres especiales: el enlace no se codifica dos veces", () => {
    const items = [{ nombre: "Tazón & Cía #1 100%", precio: 5, cantidad: 1 }];
    const link = enlaceWhatsAppCarrito({ items, totales: sinDescuento(5) });
    expect(link.includes("%2526")).toBe(false);
    expect(texto(link)).toBe(construirMensajeCarrito({ items, totales: sinDescuento(5) }));
    expect(texto(link).includes("*Tazón & Cía #1 100%*")).toBe(true);
  });
});

describe("enlaceWhatsAppCarrito", () => {
  it("carrito vacío → «#»", () => {
    expect(enlaceWhatsAppCarrito({ items: [], totales: sinDescuento(0) })).toBe("#");
  });
  it("apunta al número de pedidos y lleva el mensaje codificado", () => {
    const link = enlaceWhatsAppCarrito({ items: itemsConVariante, totales: conDescuento });
    expect(link.startsWith("https://wa.me/51978339737?text=")).toBe(true);
    expect(texto(link)).toBe(construirMensajeCarrito({ items: itemsConVariante, totales: conDescuento }));
  });
});
