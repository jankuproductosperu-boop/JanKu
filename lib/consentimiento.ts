// Consentimiento de cookies (D-75, fase 22a). Funciones puras.

export type EstadoCookies = "pendiente" | "aceptadas" | "rechazadas";

export const CLAVE_COOKIES = "janku-cookies";

/** Lee el valor guardado; cualquier otra cosa cuenta como "pendiente". */
export function leerEstadoCookies(texto: string): EstadoCookies {
  try {
    const v: unknown = JSON.parse(texto);
    return v === "aceptadas" || v === "rechazadas" ? v : "pendiente";
  } catch {
    return "pendiente";
  }
}

/** URL sin consulta ni fragmento: Google Analytics nunca recibe el token del pedido (?t=). */
export function urlSinConsulta(url: string): string {
  const corte = url.search(/[?#]/);
  return corte === -1 ? url : url.slice(0, corte);
}
