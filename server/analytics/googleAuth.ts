import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { AppError } from "@/server/http/errors";
import { log } from "@/server/logger";

// Token de acceso de Google para la cuenta de servicio de solo lectura (fase 23b, D-85).
// Se firma un JWT RS256 con `jose` (ya instalada) y se cambia por un token en oauth2.googleapis.com.
// La clave privada solo se lee de las variables de entorno; nunca va a logs, respuestas ni errores (N1-2).

const ALCANCE = "https://www.googleapis.com/auth/analytics.readonly";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const TIEMPO_MAXIMO_MS = 10_000;

export type ConfigAnalytics = { propiedad: string; email: string; clave: string };

/** Lee la configuración; null si falta alguna variable. */
export function leerConfigAnalytics(): ConfigAnalytics | null {
  const propiedad = (process.env.GA_PROPERTY_ID ?? "").trim();
  const email = (process.env.GA_SA_EMAIL ?? "").trim();
  // En Render y en .env la clave suele llegar con "\n" escritos: se convierten en saltos de línea reales.
  const clave = (process.env.GA_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (!/^\d+$/.test(propiedad) || !email || !clave) return null;
  return { propiedad, email, clave };
}

export const noConfigurado = () =>
  new AppError(503, "Google Analytics no está conectado", "ANALYTICS_NO_CONFIGURADO");
export const errorDeGoogle = () =>
  new AppError(502, "No se pudo consultar Google Analytics. Intenta en unos minutos.", "ANALYTICS_ERROR");

let enCache: { token: string; vence: number } | null = null;

/** Token válido (reutiliza el anterior hasta 1 minuto antes de que venza). */
export async function obtenerTokenGoogle(config: ConfigAnalytics): Promise<string> {
  if (enCache && enCache.vence - 60_000 > Date.now()) return enCache.token;

  let assertion: string;
  try {
    const clave = await importPKCS8(config.clave, "RS256");
    assertion = await new SignJWT({ scope: ALCANCE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(config.email)
      .setAudience(URL_TOKEN)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(clave);
  } catch {
    // Clave mal pegada: no se registra el mensaje porque podría incluir parte de la clave.
    log.error("analytics.clave_invalida", new Error("No se pudo firmar con la clave de la cuenta de servicio"));
    throw errorDeGoogle();
  }

  let res: Response;
  try {
    res = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      cache: "no-store",
    });
  } catch (err) {
    log.error("analytics.token_sin_respuesta", err);
    throw errorDeGoogle();
  }
  // Solo el código: el cuerpo de Google puede repetir datos de la cuenta.
  if (!res.ok) {
    log.warn("analytics.token_rechazado", { status: res.status });
    throw errorDeGoogle();
  }
  const datos: unknown = await res.json().catch(() => null);
  const token =
    datos && typeof datos === "object" && "access_token" in datos && typeof datos.access_token === "string"
      ? datos.access_token
      : null;
  const segundos =
    datos && typeof datos === "object" && "expires_in" in datos && typeof datos.expires_in === "number"
      ? datos.expires_in
      : 3600;
  if (!token) throw errorDeGoogle();

  enCache = { token, vence: Date.now() + segundos * 1000 };
  return token;
}
