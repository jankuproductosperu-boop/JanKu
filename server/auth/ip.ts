import "server-only";
import { ipDesdeCabeceras } from "@/lib/clientIp";

/** IP del cliente según la cadena de proxies de Render. Ver lib/clientIp.ts. */
export function obtenerIP(headers: Headers): string {
  return ipDesdeCabeceras(headers);
}
