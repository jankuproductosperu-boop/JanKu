import "server-only";
import { connectDB } from "@/server/db";
import { log } from "@/server/logger";
import {
  errorDeGoogle,
  leerConfigAnalytics,
  noConfigurado,
  obtenerTokenGoogle,
  type ConfigAnalytics,
} from "@/server/analytics/googleAuth";
import {
  RANGOS,
  codigoDeRutaProducto,
  fechaDeGA,
  nombreCanal,
  nombreDispositivo,
  ultimosDias,
  variacion,
} from "@/lib/analytics";
import { buildProductUrl } from "@/lib/productUrl";
import Product from "@/models/Product";
import type { AnalyticsResumen, AnalyticsTiempoReal, KpiAnalytics, RangoAnalytics } from "@/types";

// Estadísticas de Google Analytics 4 (fase 23b, D-85/D-86). Solo lectura, desde el servidor, con caché.
// Nada de lo que devuelve Google se reenvía como error; solo cifras ya procesadas.

const API = "https://analyticsdata.googleapis.com/v1beta/properties";
const TIEMPO_MAXIMO_MS = 10_000;
const CACHE_INFORMES_MS = 10 * 60_000;
const CACHE_TIEMPO_REAL_MS = 60_000;

type Fila = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
type Informe = { rows?: Fila[] };

const cacheInformes = new Map<RangoAnalytics, { vence: number; datos: AnalyticsResumen }>();
let cacheTiempoReal: { vence: number; datos: AnalyticsTiempoReal } | null = null;

function config(): ConfigAnalytics {
  const c = leerConfigAnalytics();
  if (!c) throw noConfigurado();
  return c;
}

async function llamarGoogle(c: ConfigAnalytics, metodo: "batchRunReports" | "runRealtimeReport", cuerpo: unknown): Promise<unknown> {
  const token = await obtenerTokenGoogle(c);
  let res: Response;
  try {
    res = await fetch(`${API}/${c.propiedad}:${metodo}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      cache: "no-store",
    });
  } catch (err) {
    log.error("analytics.sin_respuesta", err, { metodo });
    throw errorDeGoogle();
  }
  if (!res.ok) {
    // 403: la cuenta de servicio no es lectora de la propiedad o la API no está activada.
    log.warn("analytics.rechazado", { metodo, status: res.status });
    throw errorDeGoogle();
  }
  return res.json().catch(() => {
    throw errorDeGoogle();
  });
}

const numero = (v: string | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dim = (f: Fila, i = 0) => f.dimensionValues?.[i]?.value ?? "";
const met = (f: Fila, i = 0) => numero(f.metricValues?.[i]?.value);

function informes(datos: unknown): Informe[] {
  if (datos && typeof datos === "object" && "reports" in datos && Array.isArray(datos.reports)) {
    return datos.reports as Informe[];
  }
  return [];
}

function kpi(actual: number, anterior: number): KpiAnalytics {
  return { actual, anterior, variacion: variacion(actual, anterior) };
}

function hoyEnLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

/** Nombre y enlace de los productos vistos, por su código corto. Solo los que siguen existiendo. */
async function productosPorCodigo(codigos: string[]): Promise<Map<string, { id: string; nombre: string; codigoUrl: string }>> {
  const mapa = new Map<string, { id: string; nombre: string; codigoUrl: string }>();
  if (!codigos.length) return mapa;
  await connectDB();
  const docs = await Product.find({ codigoUrl: { $in: codigos } })
    .select({ nombre: 1, codigoUrl: 1 })
    .lean<{ _id: unknown; nombre: string; codigoUrl: string }[]>();
  for (const d of docs) mapa.set(d.codigoUrl, { id: String(d._id), nombre: d.nombre, codigoUrl: d.codigoUrl });
  return mapa;
}

export async function obtenerEstadisticas(rango: RangoAnalytics): Promise<AnalyticsResumen> {
  const guardado = cacheInformes.get(rango);
  if (guardado && guardado.vence > Date.now()) return guardado.datos;

  const c = config();
  const dias = RANGOS[rango];
  const actual = { startDate: `${dias - 1}daysAgo`, endDate: "today" };
  const anterior = { startDate: `${dias * 2 - 1}daysAgo`, endDate: `${dias}daysAgo` };

  const respuesta = await llamarGoogle(c, "batchRunReports", {
    requests: [
      {
        dateRanges: [
          { ...actual, name: "actual" },
          { ...anterior, name: "anterior" },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      },
      {
        dateRanges: [actual],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 200,
      },
      {
        dateRanges: [actual],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 250,
      },
      {
        dateRanges: [actual],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      },
      {
        dateRanges: [actual],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      },
    ],
  });
  const [rKpis, rSerie, rPaginas, rOrigenes, rDispositivos] = informes(respuesta);

  // 1. Indicadores: con dos periodos, Google añade la dimensión dateRange con el nombre de cada uno.
  const filaDe = (nombre: string) => (rKpis?.rows ?? []).find((f) => dim(f) === nombre);
  const fa = filaDe("actual");
  const fb = filaDe("anterior");
  const valor = (f: Fila | undefined, i: number) => (f ? met(f, i) : 0);
  const kpis: AnalyticsResumen["kpis"] = {
    usuarios: kpi(valor(fa, 0), valor(fb, 0)),
    sesiones: kpi(valor(fa, 1), valor(fb, 1)),
    vistas: kpi(valor(fa, 2), valor(fb, 2)),
    duracionMedia: kpi(Math.round(valor(fa, 3)), Math.round(valor(fb, 3))),
    rebote: kpi(Math.round(valor(fa, 4) * 1000) / 10, Math.round(valor(fb, 4) * 1000) / 10),
  };

  // 2. Serie diaria, con los días sin visitas en cero.
  const porFecha = new Map<string, { usuarios: number; vistas: number }>();
  for (const f of rSerie?.rows ?? []) {
    const fecha = fechaDeGA(dim(f));
    if (fecha) porFecha.set(fecha, { usuarios: met(f, 0), vistas: met(f, 1) });
  }
  const serie = ultimosDias(hoyEnLima(), dias).map((fecha) => ({ fecha, ...(porFecha.get(fecha) ?? { usuarios: 0, vistas: 0 }) }));

  // 3. Páginas y productos más vistos (D-86).
  const filasPaginas = rPaginas?.rows ?? [];
  const vistasPorCodigo = new Map<string, number>();
  for (const f of filasPaginas) {
    const codigo = codigoDeRutaProducto(dim(f));
    if (codigo) vistasPorCodigo.set(codigo, (vistasPorCodigo.get(codigo) ?? 0) + met(f));
  }
  const productos = await productosPorCodigo([...vistasPorCodigo.keys()]);
  const masVistos = [...vistasPorCodigo.entries()]
    .map(([codigo, vistas]) => ({ p: productos.get(codigo), vistas }))
    .filter((x): x is { p: { id: string; nombre: string; codigoUrl: string }; vistas: number } => Boolean(x.p))
    .sort((a, b) => b.vistas - a.vistas)
    .slice(0, 10)
    .map(({ p, vistas }) => ({
      productoId: p.id,
      nombre: p.nombre,
      href: `/producto/${buildProductUrl(p.nombre, p.codigoUrl)}`,
      vistas,
    }));
  const paginas = filasPaginas.slice(0, 10).map((f) => ({ ruta: dim(f), vistas: met(f) }));

  // 4. Origen y dispositivos.
  const origenes = (rOrigenes?.rows ?? []).map((f) => ({ canal: nombreCanal(dim(f)), sesiones: met(f) }));
  const dispositivos = (rDispositivos?.rows ?? []).map((f) => ({ tipo: nombreDispositivo(dim(f)), usuarios: met(f) }));

  const datos: AnalyticsResumen = {
    rango,
    kpis,
    serie,
    masVistos,
    paginas,
    origenes,
    dispositivos,
    actualizado: new Date().toISOString(),
  };
  cacheInformes.set(rango, { vence: Date.now() + CACHE_INFORMES_MS, datos });
  return datos;
}

export async function obtenerTiempoReal(): Promise<AnalyticsTiempoReal> {
  if (cacheTiempoReal && cacheTiempoReal.vence > Date.now()) return cacheTiempoReal.datos;
  const c = config();
  const respuesta = await llamarGoogle(c, "runRealtimeReport", { metrics: [{ name: "activeUsers" }] });
  const filas =
    respuesta && typeof respuesta === "object" && "rows" in respuesta && Array.isArray(respuesta.rows)
      ? (respuesta.rows as Fila[])
      : [];
  const datos: AnalyticsTiempoReal = {
    activos: filas.reduce((s, f) => s + met(f), 0),
    actualizado: new Date().toISOString(),
  };
  cacheTiempoReal = { vence: Date.now() + CACHE_TIEMPO_REAL_MS, datos };
  return datos;
}
