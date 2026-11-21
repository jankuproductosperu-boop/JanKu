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

const FUENTES: Record<string, string> = {
  "(direct)": "Directo",
  "(not set)": "Sin identificar",
  google: "Google",
  bing: "Bing",
  yahoo: "Yahoo",
  "facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "lm.facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "l.instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "chatgpt.com": "ChatGPT",
};
export const nombreFuente = (fuente: string): string => FUENTES[fuente.toLowerCase()] ?? fuente;

/**
 * Une las fuentes con el mismo nombre visible (m.facebook.com y facebook.com → Facebook), deja las `top`
 * principales y suma el resto en "Otros". Porcentajes con 1 decimal sobre el total de sesiones.
 */
export function agruparFuentes(
  filas: { fuente: string; sesiones: number }[],
  top = 4,
): { fuente: string; sesiones: number; porcentaje: number }[] {
  const porNombre = new Map<string, number>();
  for (const f of filas) {
    const nombre = nombreFuente(f.fuente);
    porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + Math.max(0, f.sesiones));
  }
  const ordenadas = [...porNombre.entries()].sort((a, b) => b[1] - a[1]);
  const total = ordenadas.reduce((s, [, n]) => s + n, 0);
  if (!total) return [];
  const principales = ordenadas.slice(0, top);
  const resto = ordenadas.slice(top).reduce((s, [, n]) => s + n, 0);
  if (resto > 0) principales.push(["Otros", resto]);
  return principales.map(([fuente, sesiones]) => ({
    fuente,
    sesiones,
    porcentaje: Math.round((sesiones / total) * 1000) / 10,
  }));
}
