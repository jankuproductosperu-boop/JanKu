// Cloudflare Turnstile (fase 26c, D-93). Funciones puras: qué se hace con el campo que llega del navegador
// y con la respuesta de siteverify. La llamada de red vive en server/auth/turnstile.ts.

import { esIPPrivada } from "@/lib/clientIp";

/** Largo máximo de un token según Cloudflare. */
export const TURNSTILE_TOKEN_MAX = 2048;

export type ResultadoTurnstile = "desactivado" | "valido" | "invalido" | "no-disponible";

/** Solo con las dos claves (la pública y la secreta) se exige la verificación; sin ellas todo sigue como antes. */
export function turnstileConfigurado(secreto: string | undefined, siteKey: string | undefined): boolean {
  return (secreto ?? "").trim().length > 0 && (siteKey ?? "").trim().length > 0;
}

function esObjetoPlano(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Saca el campo opcional `turnstileToken` del cuerpo (N1-6) antes de pasarlo por su esquema, que puede ser
 * estricto. El campo siempre se quita; si no es un texto de 1 a 2048 caracteres, cuenta como que no llegó.
 * Cualquier otra cosa (arreglo, null, texto) vuelve igual para que su esquema la rechace como siempre.
 */
export function separarTokenTurnstile(crudo: unknown): { token: string | null; cuerpo: unknown } {
  if (!esObjetoPlano(crudo) || !Object.prototype.hasOwnProperty.call(crudo, "turnstileToken")) {
    return { token: null, cuerpo: crudo };
  }
  const { turnstileToken, ...resto } = crudo;
  const token =
    typeof turnstileToken === "string" && turnstileToken.length > 0 && turnstileToken.length <= TURNSTILE_TOKEN_MAX
      ? turnstileToken
      : null;
  return { token, cuerpo: resto };
}

/** IP que se manda a siteverify: solo una pública (en local llega "::1" y no sirve de nada). */
export function ipParaSiteverify(ip: string): string | null {
  if (!ip || ip === "unknown" || esIPPrivada(ip)) return null;
  return ip;
}

// Códigos de error de siteverify (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
// Una clave secreta mal puesta no es culpa del visitante: se trata como "Cloudflare no responde".
const CODIGOS_DE_CONFIGURACION = new Set(["missing-input-secret", "invalid-input-secret"]);
const CODIGOS_DE_CLOUDFLARE = new Set(["internal-error"]);

export type Interpretacion = {
  resultado: "valido" | "invalido" | "no-disponible";
  /** Para el log: nunca lleva el token, solo códigos de Cloudflare saneados. */
  motivo: string;
};

/** Qué significa la respuesta de siteverify. `cuerpo` es el JSON ya leído, o null si no se pudo leer. */
export function interpretarSiteverify(status: number, cuerpo: unknown): Interpretacion {
  if (!esObjetoPlano(cuerpo) || typeof cuerpo.success !== "boolean") {
    return { resultado: "no-disponible", motivo: `respuesta-ilegible-${status}` };
  }
  if (cuerpo.success === true) return { resultado: "valido", motivo: "ok" };

  const codigos = (Array.isArray(cuerpo["error-codes"]) ? cuerpo["error-codes"] : [])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.replace(/[^a-z0-9-]/gi, "").slice(0, 40))
    .filter(Boolean)
    .slice(0, 5);
  const motivo = codigos.join(",") || "sin-codigo";

  if (codigos.some((c) => CODIGOS_DE_CONFIGURACION.has(c))) return { resultado: "no-disponible", motivo: `configuracion:${motivo}` };
  if (codigos.some((c) => CODIGOS_DE_CLOUDFLARE.has(c))) return { resultado: "no-disponible", motivo };
  // Un 5xx sin códigos reconocibles también es un fallo de Cloudflare, no del visitante.
  if (status >= 500 && codigos.length === 0) return { resultado: "no-disponible", motivo: `http-${status}` };
  return { resultado: "invalido", motivo };
}

/**
 * Si la petición sigue o se rechaza (y por qué). Con `aceptarSiNoDisponible` (solo el checkout, Q2 de la fase)
 * un Cloudflare caído no frena el pedido: queda el límite por IP de siempre.
 */
export function rechazoTurnstile(
  resultado: ResultadoTurnstile,
  aceptarSiNoDisponible: boolean,
): "invalido" | "no-disponible" | null {
  if (resultado === "invalido") return "invalido";
  if (resultado === "no-disponible" && !aceptarSiNoDisponible) return "no-disponible";
  return null;
}
