// Constantes del sitio. El número de pedidos vive SOLO aquí (fase 14).
export const SITE = {
  nombre: "Janku",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://jan-ku.com",
  whatsappPedidos: "51978339737",
  // Interruptor del checkout (D-27). Solo el texto exacto "true" lo activa; se lee al construir.
  checkoutHabilitado: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true",
} as const;

// Datos del titular para textos legales, pie de página y Libro de Reclamaciones (D-74, fase 22a).
// Solo aquí: ningún otro archivo repite estos datos.
export const LEGAL = {
  nombreComercial: "Janku",
  titular: "Rodrigo Alonso Contreras Trujillo",
  ruc: "10610607841",
  domicilio: "Tienda virtual · Huancayo, Junín, Perú",
  correo: "productosjanku@gmail.com",
  comprobante: "boleta de venta electrónica",
  edadMinima: 18,
  plazoFallasDias: 3,
  plazoVideoProvinciaHoras: 24,
  /** Versión de los textos legales; se guarda con cada aceptación. */
  version: "2026-11-20",
  /** Fecha visible de la última actualización. */
  actualizado: "20 de noviembre de 2026",
} as const;
