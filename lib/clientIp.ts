// IP del cliente detrás de Render (P3, decisión del dueño en la fase 07).
//
// jan-ku.com está en "DNS only": el proxy de Cloudflare del dueño no interviene.
// Pero el borde de Render es su propio Cloudflare, así que x-forwarded-for llega como
//   "<lo que mandó el visitante…>, <IP real del cliente>, <IP del borde de Cloudflare>"
// Render solo AÑADE entradas (no limpia las que manda el visitante), así que lo de la
// izquierda es falsificable. La última es del borde (compartida por muchos visitantes).
// Se lee la penúltima: la que añadió el borde de Render al recibir la conexión.
//
// No se confía en cf-connecting-ip, true-client-ip ni x-real-ip.

/** Entradas que añade la infraestructura de Render a la derecha de la IP del cliente. */
export const ENTRADAS_DE_PROXY = 1;

type LectorCabeceras = { get(nombre: string): string | null };

export function sanearIP(valor: string): string {
  return valor.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45);
}

export function ipDesdeCabeceras(headers: LectorCabeceras): string {
  const entradas = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (entradas.length === 0) return "unknown";

  // Con una sola entrada (local, o si Render quitara su Cloudflare) se usa esa.
  const indice = Math.max(0, entradas.length - 1 - ENTRADAS_DE_PROXY);
  return sanearIP(entradas[indice]) || "unknown";
}

/**
 * DIAGNÓSTICO TEMPORAL (P3): cadena saneada de cabeceras de IP, solo para el log de un login de admin correcto.
 * Sirve para ajustar ENTRADAS_DE_PROXY en producción; se quita en cuanto quede ajustado. No decide nada.
 */
export function diagnosticoIP(headers: LectorCabeceras): { xff: string[]; cf: string; realIp: string } {
  const xff = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((e) => sanearIP(e.trim()))
    .filter(Boolean)
    .slice(-10); // las de la derecha son las de la infraestructura
  return {
    xff,
    cf: sanearIP(headers.get("cf-connecting-ip") ?? ""),
    realIp: sanearIP(headers.get("x-real-ip") ?? ""),
  };
}
