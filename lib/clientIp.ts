// IP del cliente detrás de Render (P3, decisión del dueño en la fase 07; ajustada con datos reales el 2026-11-17).
//
// jan-ku.com está en "DNS only": el proxy de Cloudflare del dueño no interviene.
// En producción x-forwarded-for llega así (medido en el log login_admin.ok):
//   "<lo que mandó el visitante…>, <IP real del cliente>, <borde de Cloudflare de Render>, <balanceador interno de Render>"
//   p. ej. "38.25.29.31, 172.71.151.63, 10.27.70.5"
// Render solo AÑADE entradas (no limpia las que manda el visitante), así que lo de la izquierda es falsificable.
// Por la derecha: 1) se descartan las IPs privadas (solo las añade la red interna de Render; un visitante no puede
// poner nada a la derecha), 2) se salta el borde de Cloudflare (ENTRADAS_DE_PROXY). Si Render quitara su salto
// interno, la regla sigue acertando.
//
// No se confía en cf-connecting-ip, true-client-ip ni x-real-ip.

/** Entradas PÚBLICAS que añade la infraestructura de Render a la derecha de la IP del cliente (su Cloudflare). */
export const ENTRADAS_DE_PROXY = 1;

type LectorCabeceras = { get(nombre: string): string | null };

export function sanearIP(valor: string): string {
  return valor.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45);
}

/** Direcciones de red privada, loopback o enlace local (IPv4, IPv6 e IPv4 mapeada en IPv6). */
export function esIPPrivada(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^::ffff:/, "");
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(v);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) // CGNAT, usado por redes internas de nubes
    );
  }
  return v === "::1" || /^f[cd][0-9a-f]{0,2}:/.test(v) || /^fe[89ab][0-9a-f]?:/.test(v);
}

export function ipDesdeCabeceras(headers: LectorCabeceras): string {
  const entradas = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((e) => sanearIP(e.trim()))
    .filter(Boolean);
  if (entradas.length === 0) return "unknown";

  // 1. Saltos internos de Render (privados) por la derecha; siempre queda al menos una entrada (local: "::1").
  let fin = entradas.length;
  while (fin > 1 && esIPPrivada(entradas[fin - 1])) fin--;

  // 2. Borde de Cloudflare. Con una sola entrada (local) se usa esa.
  const indice = Math.max(0, fin - 1 - ENTRADAS_DE_PROXY);
  return entradas[indice] || "unknown";
}
