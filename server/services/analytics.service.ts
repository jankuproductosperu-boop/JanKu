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
  agruparFuentes,
  codigoDeRutaProducto,
  fechaDeGA,
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

/** Valor de la dimensión `dateRange` que Google añade cuando hay dos periodos (los nombres que les damos). */
const PERIODOS = new Set(["actual", "anterior", "este", "pasado"]);
const periodoDe = (f: Fila) => (f.dimensionValues ?? []).map((d) => d.value ?? "").find((v) => PERIODOS.has(v)) ?? "";
const dimSinPeriodo = (f: Fila) => (f.dimensionValues ?? []).map((d) => d.value ?? "").find((v) => !PERIODOS.has(v)) ?? "";

export async function obtenerEstadisticas(rango: RangoAnalytics): Promise<AnalyticsResumen> {
  const guardado = cacheInformes.get(rango);
  if (guardado && guardado.vence > Date.now()) return guardado.datos;

  const c = config();
  const dias = RANGOS[rango];
  // Mismo criterio que Google Analytics: «últimos N días» termina ayer.
  const actual = { startDate: `${dias}daysAgo`, endDate: "yesterday" };
  const anterior = { startDate: `${dias * 2}daysAgo`, endDate: `${dias + 1}daysAgo` };
  const dosPeriodos = [
    { ...actual, name: "actual" },
    { ...anterior, name: "anterior" },
  ];
  const hoy = hoyEnLima();
  const anio = Number(hoy.slice(0, 4));

  const [respuestaA, respuestaB] = await Promise.all([
    llamarGoogle(c, "batchRunReports", {
      requests: [
        {
          dateRanges: dosPeriodos,
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
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 250,
        },
        {
          dateRanges: [actual],
          dimensions: [{ name: "countryId" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        },
        {
          dateRanges: dosPeriodos,
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }],
          limit: 20,
        },
      ],
    }),
    llamarGoogle(c, "batchRunReports", {
      requests: [
        {
          dateRanges: [actual],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 50,
        },
        {
          dateRanges: [
            { startDate: `${anio}-01-01`, endDate: "today", name: "este" },
            { startDate: `${anio - 1}-01-01`, endDate: `${anio - 1}-12-31`, name: "pasado" },
          ],
          dimensions: [{ name: "month" }],
          metrics: [{ name: "activeUsers" }],
          limit: 40,
        },
        {
          dateRanges: [{ startDate: "today", endDate: "today" }],
          metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
        },
        {
          dateRanges: [actual],
          dimensions: [{ name: "city" }],
          metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 8,
        },
      ],
    }),
  ]);
  const [rKpis, rSerie, rPaginas, rPaises, rDispositivos] = informes(respuestaA);
  const [rFuentes, rMensual, rHoy, rCiudades] = informes(respuestaB);

  // 1. Indicadores del periodo frente al anterior.
  const filaDe = (nombre: string) => (rKpis?.rows ?? []).find((f) => periodoDe(f) === nombre);
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

  // 2. Serie diaria hasta ayer, con los días sin visitas en cero.
  const porFecha = new Map<string, { usuarios: number; vistas: number }>();
  for (const f of rSerie?.rows ?? []) {
    const fecha = fechaDeGA(dim(f));
    if (fecha) porFecha.set(fecha, { usuarios: met(f, 0), vistas: met(f, 1) });
  }
  const ayer = ultimosDias(hoy, 2)[0];
  const serie = ultimosDias(ayer, dias).map((fecha) => ({ fecha, ...(porFecha.get(fecha) ?? { usuarios: 0, vistas: 0 }) }));

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
  const totalUsuarios = kpis.usuarios.actual;
  const paginas = filasPaginas.slice(0, 8).map((f) => ({
    ruta: dim(f),
    vistas: met(f, 0),
    usuarios: met(f, 1),
    porcentaje: totalUsuarios ? Math.round((met(f, 1) / totalUsuarios) * 1000) / 10 : 0,
  }));

  // 4. Países (código ISO; el nombre lo pone el navegador en español).
  const paises = (rPaises?.rows ?? []).map((f) => {
    const codigo = dim(f);
    return { codigo: /^[A-Z]{2}$/.test(codigo) ? codigo : "", usuarios: met(f) };
  });

  // 4b. Ciudades (en lugar de un mapa: para una tienda local dice más).
  const ciudades = (rCiudades?.rows ?? []).map((f) => {
    const nombre = dim(f);
    return {
      ciudad: !nombre || nombre === "(not set)" ? "Sin identificar" : nombre,
      usuarios: met(f, 0),
      vistas: met(f, 1),
      porcentaje: totalUsuarios ? Math.round((met(f, 0) / totalUsuarios) * 1000) / 10 : 0,
    };
  });

  // 5. Dispositivos con su variación.
  const porDispositivo = new Map<string, { actual: number; anterior: number }>();
  for (const f of rDispositivos?.rows ?? []) {
    const tipo = dimSinPeriodo(f);
    const previo = porDispositivo.get(tipo) ?? { actual: 0, anterior: 0 };
    if (periodoDe(f) === "actual") previo.actual += met(f);
    else previo.anterior += met(f);
    porDispositivo.set(tipo, previo);
  }
  const dispositivos = [...porDispositivo.entries()]
    .filter(([, v]) => v.actual > 0)
    .sort((a, b) => b[1].actual - a[1].actual)
    .map(([tipo, v]) => ({ tipo: nombreDispositivo(tipo), usuarios: v.actual, variacion: variacion(v.actual, v.anterior) }));

  // 6. Fuentes, meses y hoy.
  const fuentes = agruparFuentes((rFuentes?.rows ?? []).map((f) => ({ fuente: dim(f), sesiones: met(f) })));
  const mensual = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, esteAnio: 0, anioPasado: 0 }));
  for (const f of rMensual?.rows ?? []) {
    const mes = Number(dimSinPeriodo(f));
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) continue;
    if (periodoDe(f) === "este") mensual[mes - 1].esteAnio += met(f);
    else mensual[mes - 1].anioPasado += met(f);
  }
  const filaHoy = rHoy?.rows?.[0];

  const datos: AnalyticsResumen = {
    rango,
    kpis,
    hoy: { usuarios: filaHoy ? met(filaHoy, 0) : 0, vistas: filaHoy ? met(filaHoy, 1) : 0 },
    serie,
    mensual,
    masVistos,
    paginas,
    paises,
    ciudades,
    fuentes,
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
