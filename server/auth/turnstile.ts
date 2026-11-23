import "server-only";
import { AppError } from "@/server/http/errors";
import { log } from "@/server/logger";
import {
  interpretarSiteverify,
  ipParaSiteverify,
  rechazoTurnstile,
  turnstileConfigurado,
  type ResultadoTurnstile,
} from "@/lib/turnstile";

export { separarTokenTurnstile } from "@/lib/turnstile";

// Cloudflare Turnstile (fase 26c, D-93). Nunca se registra el token ni la clave secreta.

const URL_SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 3_000;

/** Verifica el token con Cloudflare. Sin las dos claves configuradas devuelve "desactivado" sin llamar a nadie. */
export async function verificarTurnstile(token: string | null, ip: string): Promise<ResultadoTurnstile> {
  const secreto = process.env.TURNSTILE_SECRET_KEY ?? "";
  // La clave pública se lee al construir, igual que en el navegador: las dos partes ven el mismo valor.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  if (!turnstileConfigurado(secreto, siteKey)) return "desactivado";

  if (!token) {
    log.warn("turnstile.rechazado", { motivo: "sin-token" });
    return "invalido";
  }

  const cuerpo = new URLSearchParams({ secret: secreto.trim(), response: token });
  const remota = ipParaSiteverify(ip);
  if (remota) cuerpo.set("remoteip", remota);

  let status: number;
  let datos: unknown;
  try {
    const res = await fetch(URL_SITEVERIFY, {
      method: "POST",
      body: cuerpo,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    status = res.status;
    datos = await res.json().catch(() => null);
  } catch (err) {
    const motivo = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "red";
    log.warn("turnstile.no_responde", { motivo });
    return "no-disponible";
  }

  const { resultado, motivo } = interpretarSiteverify(status, datos);
  if (resultado === "invalido") log.warn("turnstile.rechazado", { motivo });
  if (resultado === "no-disponible") {
    if (motivo.startsWith("configuracion:")) {
      log.error("turnstile.configuracion", new Error("Cloudflare rechazó TURNSTILE_SECRET_KEY"), { motivo });
    } else {
      log.warn("turnstile.no_responde", { motivo });
    }
  }
  return resultado;
}

/**
 * Verifica y decide. Devuelve el error a responder, o null si la petición sigue.
 * `aceptarSiNoDisponible`: solo el checkout (Q2): si Cloudflare no responde, el pedido sigue con el límite por IP.
 */
export async function comprobarTurnstile(
  token: string | null,
  ip: string,
  opciones: { aceptarSiNoDisponible: boolean },
): Promise<AppError | null> {
  const resultado = await verificarTurnstile(token, ip);
  const rechazo = rechazoTurnstile(resultado, opciones.aceptarSiNoDisponible);
  if (rechazo === "invalido") {
    return new AppError(
      400,
      "No pudimos comprobar que no eres un robot. Recarga la página e inténtalo de nuevo.",
      "VERIFICACION_FALLIDA",
    );
  }
  if (rechazo === "no-disponible") {
    return new AppError(
      503,
      "No pudimos completar la verificación de seguridad. Inténtalo de nuevo en unos minutos.",
      "VERIFICACION_NO_DISPONIBLE",
    );
  }
  return null;
}
