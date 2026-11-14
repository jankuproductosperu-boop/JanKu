import { SITE } from "@/lib/siteConfig";
import type { Totales } from "@/lib/pricing";

const SITE_URL = SITE.url;

/**
 * Arma el link completo de WhatsApp a partir de solo el número,
 * con un mensaje automático que incluye el nombre y el link del producto.
 * No necesitas escribir el mensaje ni el link a mano — se arma solo.
 */
export function buildWhatsAppLink(
  numero: string | undefined,
  nombre: string,
  urlRelativa: string,
  variante?: string // etiqueta de la variante elegida (fase 13b); sin ella el mensaje es el de siempre
): string {
  const numeroLimpio = (numero || "").replace(/\D/g, ""); // solo dígitos
  if (!numeroLimpio) return "";

  const nombreCompleto = variante ? `${nombre} (${variante})` : nombre;
  const mensaje = `Hola, estoy interesado(a) en: ${nombreCompleto}\n${SITE_URL}${urlRelativa}`;
  return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
}

export type ItemMensaje = { nombre: string; precio: number; cantidad: number; varianteEtiqueta?: string };

/** Mensaje del pedido por WhatsApp. Debe producir exactamente el texto que el carrito generaba antes (N1-1). */
export function construirMensajeCarrito(args: { items: ItemMensaje[]; totales: Totales }): string {
  const { items, totales } = args;
  let mensaje = "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n";

  items.forEach((item, index) => {
    mensaje += `${index + 1}. *${item.nombre}*\n`;
    if (item.varianteEtiqueta) mensaje += `   🎨 ${item.varianteEtiqueta}\n`;
    mensaje += `   💰 Precio: S/ ${item.precio.toFixed(2)}\n`;
    mensaje += `   📦 Cantidad: ${item.cantidad}\n`;
    mensaje += `   💵 Subtotal: S/ ${(item.precio * item.cantidad).toFixed(2)}\n\n`;
  });

  mensaje += `Subtotal: S/ ${totales.subtotal.toFixed(2)}\n`;
  if (totales.nivel && totales.aplicado !== "cupon") {
    mensaje += `🎉 Descuento aplicado (${totales.nivel.nombre}): -S/ ${totales.descuentoNivel.toFixed(2)}\n`;
  }
  mensaje += `*TOTAL: S/ ${totales.total.toFixed(2)}*\n\n`;
  mensaje += "Deseo comprar estos productos. ¡Gracias! 😊";
  return mensaje;
}

/** Enlace de WhatsApp para coordinar un pedido ya guardado (fase 15). */
export function enlaceWhatsAppPedido(args: { codigo: string; total: number; nombre: string }): string {
  const mensaje = `¡Hola! 👋 Soy ${args.nombre}. Acabo de hacer el pedido *${args.codigo}* por *S/ ${args.total.toFixed(2)}*. Quiero coordinar el pago y la entrega. ¡Gracias!`;
  return `https://wa.me/${SITE.whatsappPedidos}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace de WhatsApp con el pedido del carrito; «#» si el carrito está vacío. */
export function enlaceWhatsAppCarrito(args: { items: ItemMensaje[]; totales: Totales }): string {
  if (args.items.length === 0) return "#";
  return `https://wa.me/${SITE.whatsappPedidos}?text=${encodeURIComponent(construirMensajeCarrito(args))}`;
}
