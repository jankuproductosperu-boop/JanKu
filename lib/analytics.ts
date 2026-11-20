// Funciones puras para las estadísticas de Google Analytics (fase 23b). Sin red ni servidor.
import { extractCodigoUrl } from "@/lib/productUrl";
import type { RangoAnalytics } from "@/types";

export const RANGOS: Record<RangoAnalytics, number> = { "7d": 7, "28d": 28, "90d": 90 };

/** Variación porcentual con 1 decimal; null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior) || anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

/** Código del producto a partir de una ruta "/producto/{slug}"; null si la ruta no es de producto. */
export function codigoDeRutaProducto(ruta: string): string | null {
  const m = /^\/producto\/([^/?#]+)\/?$/.exec(ruta);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  const codigo = extractCodigoUrl(slug);
  return codigo ? codigo : null;
}

/** "3m 40s", "45s", "1h 05m". */
export function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.round(Number.isFinite(segundos) ? segundos : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(r).padStart(2, "0")}s`;
  return `${r}s`;
}

/** "20261120" → "2026-11-20"; cualquier otra cosa → null. */
export function fechaDeGA(valor: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(valor);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Los últimos `dias` días (AAAA-MM-DD) que terminan en `hoy`, del más antiguo al más reciente. */
export function ultimosDias(hoy: string, dias: number): string[] {
  const base = Date.parse(`${hoy}T00:00:00Z`);
  if (!Number.isFinite(base) || dias < 1) return [];
  const lista: string[] = [];
  for (let i = dias - 1; i >= 0; i--) lista.push(new Date(base - i * 86_400_000).toISOString().slice(0, 10));
  return lista;
}

const CANALES: Record<string, string> = {
  Direct: "Directo",
  "Organic Search": "Búsqueda en Google",
  "Organic Social": "Redes sociales",
  "Paid Social": "Redes (pagado)",
  "Paid Search": "Búsqueda pagada",
  Referral: "Otros sitios",
  Email: "Correo",
  "Organic Video": "Video",
  "Organic Shopping": "Compras",
  Unassigned: "Sin identificar",
  "(other)": "Otros",
};
export const nombreCanal = (canal: string): string => CANALES[canal] ?? canal;

const DISPOSITIVOS: Record<string, string> = { mobile: "Celular", desktop: "Computadora", tablet: "Tablet", "smart tv": "TV" };
export const nombreDispositivo = (tipo: string): string => DISPOSITIVOS[tipo] ?? tipo;
