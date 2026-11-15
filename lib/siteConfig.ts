// Constantes del sitio. El número de pedidos vive SOLO aquí (fase 14).
export const SITE = {
  nombre: "Janku",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://jan-ku.com",
  whatsappPedidos: "51978339737",
  // Interruptor del checkout (D-27). Solo el texto exacto "true" lo activa; se lee al construir.
  checkoutHabilitado: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true",
} as const;
