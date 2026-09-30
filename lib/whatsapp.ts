const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jan-ku.com";

/**
 * Arma el link completo de WhatsApp a partir de solo el número,
 * con un mensaje automático que incluye el nombre y el link del producto.
 * No necesitas escribir el mensaje ni el link a mano — se arma solo.
 */
export function buildWhatsAppLink(
  numero: string | undefined,
  nombre: string,
  urlRelativa: string
): string {
  const numeroLimpio = (numero || "").replace(/\D/g, ""); // solo dígitos
  if (!numeroLimpio) return "";

  const mensaje = `Hola, estoy interesado(a) en: ${nombre}\n${SITE_URL}${urlRelativa}`;
  return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
}