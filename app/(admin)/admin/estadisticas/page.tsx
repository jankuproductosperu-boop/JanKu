"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Clock, TrendingDown, Users } from "lucide-react";
import type { AnalyticsResumen, AnalyticsTiempoReal, KpiAnalytics, RangoAnalytics } from "@/types";
import { formatearDuracion } from "@/lib/analytics";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { TarjetaIndicador } from "@/app/(admin)/admin/_components/ui";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";
import { MapaVisitas, type VistaMapa } from "@/app/(admin)/admin/estadisticas/_mapas/MapaVisitas";

// Estadísticas de Google Analytics (fase 23b). Solo superadmin. Las cifras solo cuentan a quien
// aceptó las cookies (D-75): sirven para comparar, no como conteo exacto (D-86).
// Gráficos dibujados aquí mismo en SVG: sin librerías nuevas. Mapa de visitas: fase 23d (D-94).

const RANGOS: { valor: RangoAnalytics; etiqueta: string }[] = [
  { valor: "7d", etiqueta: "7 días" },
  { valor: "28d", etiqueta: "28 días" },
  { valor: "90d", etiqueta: "90 días" },
];
/** Colores de series: azul Janku, ámbar, celeste, verde y coral; legibles en claro y en oscuro. */
const PALETA = ["#3552ad", "#f7b84b", "#299cdb", "#0ab39c", "#f06548"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const miles = (n: number) => n.toLocaleString("es-PE");
const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

function nombrePais(codigo: string): string {
  if (!codigo) return "Sin identificar";
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}
/** Bandera con los indicadores regionales de Unicode ("PE" → 🇵🇪). */
const bandera = (codigo: string) =>
  codigo ? String.fromCodePoint(...[...codigo].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐";

function Flecha({ v, inversa = false }: { v: number | null; inversa?: boolean }) {
  if (v === null) return <span className="text-[var(--muted)]">—</span>;
  const bueno = inversa ? v <= 0 : v >= 0;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        bueno ? "bg-[var(--ok-soft)] text-[var(--ok)]" : "bg-[var(--bad-soft)] text-[var(--bad)]"
      }`}
    >
      {v > 0 ? "↑" : v < 0 ? "↓" : "="} {Math.abs(v).toFixed(1)} %
    </span>
  );
}

function Variacion({ k, inversa = false }: { k: KpiAnalytics; inversa?: boolean }) {
  if (k.variacion === null) return <span>Sin periodo anterior para comparar</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flecha v={k.variacion} inversa={inversa} /> frente al periodo anterior
    </span>
  );
}

function Tarjeta({
  titulo,
  extra,
  children,
  className = "",
  cuerpo = "",
}: {
  titulo: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Clases extra del cuerpo (por ejemplo, para que un gráfico llene el alto). */
  cuerpo?: string;
}) {
  return (
    <section className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
        <h2 className="font-semibold text-[16px]">{titulo}</h2>
        {extra}
      </div>
      <div className={`p-5 flex-1 ${cuerpo}`}>{children}</div>
    </section>
  );
}

const SinDatos = () => <p className="text-sm text-[var(--muted)]">Aún no hay datos en este periodo.</p>;

/** Visitas por día: vistas (área) y usuarios (línea). */
function GraficoDiario({ serie }: { serie: AnalyticsResumen["serie"] }) {
  const W = 640;
  const H = 240;
  const m = { izq: 40, der: 8, arr: 10, aba: 26 };
  const max = Math.max(1, ...serie.map((p) => Math.max(p.vistas, p.usuarios)));
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  const tope = Math.ceil(max / paso) * paso;
  const x = (i: number) => m.izq + (serie.length <= 1 ? 0 : (i * (W - m.izq - m.der)) / (serie.length - 1));
  const y = (v: number) => H - m.aba - (v / tope) * (H - m.arr - m.aba);
  const linea = (campo: "vistas" | "usuarios") => serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[campo]).toFixed(1)}`).join(" ");
  const area = `${linea("vistas")} L${x(serie.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const marcas = [0, 0.5, 1].map((f) => Math.round(tope * f));
  const cadaX = Math.max(1, Math.ceil(serie.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Vistas y usuarios por día">
      <defs>
        <linearGradient id="area-vistas" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={PALETA[0]} stopOpacity="0.28" />
          <stop offset="100%" stopColor={PALETA[0]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {marcas.map((v) => (
        <g key={v}>
          <line x1={m.izq} x2={W - m.der} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={m.izq - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{miles(v)}</text>
        </g>
      ))}
      {serie.map((p, i) =>
        i % cadaX === 0 || i === serie.length - 1 ? (
          <text key={p.fecha} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{fechaCorta(p.fecha)}</text>
        ) : null,
      )}
      <path d={area} fill="url(#area-vistas)" />
      <path d={linea("vistas")} fill="none" stroke={PALETA[0]} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={linea("usuarios")} fill="none" stroke={PALETA[3]} strokeWidth="2" strokeLinejoin="round" />
      {serie.map((p, i) => (
        <circle key={p.fecha} cx={x(i)} cy={y(p.vistas)} r={serie.length > 31 ? 0 : 3} fill={PALETA[0]}>
          <title>{`${fechaCorta(p.fecha)}: ${miles(p.vistas)} vistas, ${miles(p.usuarios)} usuarios`}</title>
        </circle>
      ))}
    </svg>
  );
}

/** Paso "redondo" del eje (1, 2, 2.5 o 5 × potencia de 10) para unas 4 marcas. */
function pasoDelEje(max: number): number {
  const bruto = Math.max(1, max) / 4;
  const base = Math.pow(10, Math.floor(Math.log10(bruto)));
  const opciones = [1, 2, 2.5, 5, 10].map((m) => m * base);
  return opciones.find((o) => o >= bruto) ?? 10 * base;
}

/** Barras de países: como mucho estas; el resto se cuenta al pie. */
const MAX_PAISES = 10;

/**
 * Barras horizontales como el modelo de referencia: nombres a la izquierda contra el eje, barras con su
 * cifra al final y eje inferior con marcas. Hecho con HTML (no SVG). Fase 23d: el gráfico tiene alto fijo
 * (en pantallas grandes, el de la fila, que marca la tarjeta del mapa) y las filas se reparten ese alto,
 * haya 1 o 10 países; el contenido va en posición absoluta para que nunca estire la tarjeta.
 * La fila con más usuarios se resalta en coral.
 */
function BarrasPaises({ filas, resto }: { filas: { etiqueta: string; clave: string; valor: number }[]; resto: number }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const paso = pasoDelEje(max);
  const tope = Math.ceil(max / paso) * paso;
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  const pct = (v: number) => `${(v / tope) * 100}%`;
  const eje = "border-[color-mix(in_srgb,var(--muted)_45%,transparent)]";

  return (
    <div className="relative flex-1 min-h-[380px]" role="img" aria-label="Usuarios por país">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 min-h-0 grid" style={{ gridTemplateRows: `repeat(${filas.length}, minmax(0, 1fr))` }}>
          {filas.map((f, i) => (
            <div key={f.clave} className="grid grid-cols-[6.5rem_1fr] items-center min-h-0">
              <span className="pr-2.5 text-right text-[11.5px] text-[var(--muted)] truncate" title={f.etiqueta}>
                {f.etiqueta}
              </span>
              <div className={`relative h-full border-l ${eje} pr-12 flex items-center`}>
                <div
                  className="h-[62%] max-h-[40px] min-h-[8px] rounded-r-[3px]"
                  style={{ width: pct(f.valor), minWidth: 3, background: i === 0 ? "#f06548" : "#299cdb" }}
                  title={`${f.etiqueta}: ${miles(f.valor)} usuarios`}
                />
                <span className="ml-2 text-[11.5px] text-[var(--ink)] whitespace-nowrap">{miles(f.valor)}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Eje inferior con sus marcas */}
        <div className="grid grid-cols-[6.5rem_1fr]">
          <span />
          <div className={`border-t ${eje} pr-12`}>
            <div className="relative h-7">
              {marcas.map((v, i) => (
                <span key={v} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: pct(v) }}>
                  <span className={`h-1.5 border-l ${eje}`} />
                  {/* Con más de 3 marcas se rotula una sí y otra no: en la columna estrecha las cifras se pisaban. */}
                  {(marcas.length <= 3 || i % 2 === 0) && <span className="text-[11px] text-[var(--muted)] mt-0.5">{miles(v)}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
        {resto > 0 && (
          <p className="mt-1 text-right text-[11px] text-[var(--muted)]">
            y {miles(resto)} {resto === 1 ? "país" : "países"} más
          </p>
        )}
      </div>
    </div>
  );
}

/** Usuarios por mes: este año frente al año pasado (barras redondeadas lado a lado). */
function GraficoMensual({ mensual }: { mensual: AnalyticsResumen["mensual"] }) {
  const W = 640;
  const H = 230;
  const m = { izq: 8, der: 8, arr: 10, aba: 26 };
  const max = Math.max(1, ...mensual.map((x) => Math.max(x.esteAnio, x.anioPasado)));
  const ancho = (W - m.izq - m.der) / 12;
  const barra = Math.min(12, ancho / 3.4);
  const alto = (v: number) => (v / max) * (H - m.arr - m.aba);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Usuarios por mes, este año y el año pasado">
        <line x1={m.izq} x2={W - m.der} y1={H - m.aba} y2={H - m.aba} stroke="var(--line)" />
        {mensual.map((x, i) => {
          const cx = m.izq + ancho * i + ancho / 2;
          return (
            <g key={x.mes}>
              <rect x={cx - barra - 2} y={H - m.aba - alto(x.anioPasado)} width={barra} height={alto(x.anioPasado)} rx={barra / 2} fill="var(--line)">
                <title>{`${MESES[i]} año pasado: ${miles(x.anioPasado)} usuarios`}</title>
              </rect>
              <rect x={cx + 2} y={H - m.aba - alto(x.esteAnio)} width={barra} height={alto(x.esteAnio)} rx={barra / 2} fill={PALETA[0]}>
                <title>{`${MESES[i]} este año: ${miles(x.esteAnio)} usuarios`}</title>
              </rect>
              <text x={cx} y={H - 7} textAnchor="middle" fontSize="11" fill="var(--muted)">{MESES[i]}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-center gap-5 text-xs text-[var(--muted)] mt-1">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[var(--line)]" /> Año pasado</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETA[0] }} /> Este año</span>
      </div>
    </div>
  );
}

/** Anillo de dispositivos. */
function Anillo({ partes }: { partes: { valor: number; color: string; etiqueta: string }[] }) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  const r = 70;
  const largo = 2 * Math.PI * r;
  // Cada tramo empieza donde terminan los anteriores (sin reasignar variables durante el render).
  const tramos = partes.map((p, i) => ({
    ...p,
    tramo: (p.valor / total) * largo,
    inicio: partes.slice(0, i).reduce((s, q) => s + (q.valor / total) * largo, 0),
  }));
  return (
    <svg viewBox="0 0 200 200" className="w-[190px] h-[190px] mx-auto" role="img" aria-label="Usuarios por dispositivo">
      <circle cx="100" cy="100" r={r} fill="none" stroke="var(--line)" strokeWidth="22" />
      {tramos.map((p) => (
        <circle
          key={p.etiqueta}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={p.color}
          strokeWidth="22"
          strokeDasharray={`${p.tramo} ${largo - p.tramo}`}
          strokeDashoffset={-p.inicio}
          transform="rotate(-90 100 100)"
        >
          <title>{`${p.etiqueta}: ${miles(p.valor)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function SinConexion() {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm space-y-3 max-w-3xl">
      <h2 className="text-lg font-semibold">Conecta Google Analytics</h2>
      <p className="text-sm text-[var(--muted)]">Faltan las credenciales en el servidor. Se hace una sola vez:</p>
      <ol className="list-decimal pl-5 space-y-1.5 text-sm">
        <li>En Google Cloud, crea un proyecto y activa la «Google Analytics Data API».</li>
        <li>Crea una cuenta de servicio y descarga su clave en formato JSON.</li>
        <li>En Google Analytics → Administrar → Gestión del acceso a la propiedad, agrega el correo de la cuenta de servicio como «Lector».</li>
        <li>
          Pon en Render (y en <code>.env.local</code>) las variables <code>GA_PROPERTY_ID</code> (el número de la propiedad),{" "}
          <code>GA_SA_EMAIL</code> y <code>GA_SA_PRIVATE_KEY</code>, y vuelve a desplegar.
        </li>
      </ol>
    </section>
  );
}

const VISTAS_MAPA: { valor: VistaMapa; etiqueta: string }[] = [
  { valor: "peru", etiqueta: "Perú" },
  { valor: "lima", etiqueta: "Lima" },
  { valor: "mundo", etiqueta: "Mundo" },
];

/** Región tal como la da Google, o «Sin identificar» si no la sabe. */
const nombreRegion = (region: string) => (!region || region === "(not set)" ? "Sin identificar" : region);

/** Mapa de usuarios con selector Perú · Lima · Mundo y, debajo, las ciudades (fase 23d: sustituye a «Usuarios por ciudad»). */
function TarjetaMapa({ d }: { d: AnalyticsResumen }) {
  const [vista, setVista] = useState<VistaMapa>("peru");
  const filas = useMemo(
    () =>
      vista === "mundo"
        ? d.paises.map((p) => ({ clave: p.codigo, usuarios: p.usuarios }))
        : (d.regiones ?? []).map((r) => ({ clave: r.region, usuarios: r.usuarios })),
    [d, vista],
  );

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
        <h2 className="font-semibold text-[16px]">Mapa de usuarios</h2>
        <div className="flex gap-1 flex-none" role="tablist" aria-label="Mapa">
          {VISTAS_MAPA.map((o) => (
            <button
              key={o.valor}
              role="tab"
              aria-selected={vista === o.valor}
              onClick={() => setVista(o.valor)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                vista === o.valor ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95"
              }`}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pt-4 pb-3">
        <MapaVisitas vista={vista} filas={filas} nombreDe={vista === "mundo" ? nombrePais : nombreRegion} />
      </div>
      {d.ciudades.length === 0 ? (
        <div className="px-5 py-4 border-t border-dashed border-[var(--line)]"><SinDatos /></div>
      ) : (
        // Columnas de cifras con ancho fijo y la ciudad recortada con «…»: la tabla nunca se sale de la tarjeta.
        <table className="w-full table-fixed text-sm border-t border-dashed border-[var(--line)]">
          <thead className="text-left text-[var(--muted)] bg-[var(--bg)]">
            <tr>
              <th className="pl-5 pr-2 py-2.5 font-medium">Ciudad</th>
              <th className="w-[5rem] px-2 py-2.5 font-medium text-right">Usuarios</th>
              <th className="w-[4.5rem] px-2 py-2.5 font-medium text-right">Vistas</th>
              <th className="w-[4.75rem] pl-2 pr-5 py-2.5 font-medium text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {d.ciudades.slice(0, 5).map((c, i) => (
              <tr key={`${c.ciudad}-${i}`} className="border-t border-[var(--line)]">
                <td className="pl-5 pr-2 py-2 truncate" title={c.ciudad}>{c.ciudad}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{miles(c.usuarios)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{miles(c.vistas)}</td>
                <td className="pl-2 pr-5 py-2 text-right whitespace-nowrap text-[var(--muted)]">{c.porcentaje.toFixed(1)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Audiencia: visitas por día o usuarios por mes, con sus tres cifras arriba (como en el modelo). */
function TarjetaAudiencia({ d }: { d: AnalyticsResumen }) {
  const [vista, setVista] = useState<"dia" | "mes">("dia");
  const paginasPorSesion = d.kpis.sesiones.actual ? d.kpis.vistas.actual / d.kpis.sesiones.actual : 0;
  const mesActual = new Date().getMonth() + 1;
  const esteAnio = d.mensual.reduce((s, m) => s + m.esteAnio, 0);
  const mismoPeriodoPasado = d.mensual.filter((m) => m.mes <= mesActual).reduce((s, m) => s + m.anioPasado, 0);
  const mejorMes = d.mensual.reduce((a, b) => (b.esteAnio > a.esteAnio ? b : a), d.mensual[0]);
  const cifras =
    vista === "dia"
      ? [
          { valor: miles(d.kpis.vistas.actual), extra: <Flecha v={d.kpis.vistas.variacion} />, etiqueta: "Vistas de página" },
          { valor: miles(d.kpis.usuarios.actual), extra: <Flecha v={d.kpis.usuarios.variacion} />, etiqueta: "Usuarios" },
          { valor: paginasPorSesion.toFixed(2), extra: null, etiqueta: "Páginas por sesión" },
        ]
      : [
          { valor: miles(esteAnio), extra: null, etiqueta: "Usuarios este año" },
          {
            valor: miles(mismoPeriodoPasado),
            extra: <Flecha v={mismoPeriodoPasado ? Math.round(((esteAnio - mismoPeriodoPasado) / mismoPeriodoPasado) * 1000) / 10 : null} />,
            etiqueta: "Mismo periodo del año pasado",
          },
          { valor: mejorMes?.esteAnio ? MESES[mejorMes.mes - 1] : "—", extra: null, etiqueta: "Mejor mes" },
        ];

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
        <h2 className="font-semibold text-[16px]">Audiencia</h2>
        <div className="flex gap-1.5" role="tablist" aria-label="Vista de la audiencia">
          {(
            [
              { valor: "dia", etiqueta: "Por día" },
              { valor: "mes", etiqueta: "Por mes" },
            ] as const
          ).map((o) => (
            <button
              key={o.valor}
              role="tab"
              aria-selected={vista === o.valor}
              onClick={() => setVista(o.valor)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                vista === o.valor ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95"
              }`}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 border-b border-dashed border-[var(--line)] text-center">
        {cifras.map((x, i) => (
          <div key={x.etiqueta} className={`py-4 px-2 ${i ? "border-l border-dashed border-[var(--line)]" : ""}`}>
            <div className="text-lg font-semibold inline-flex items-center gap-2">
              {x.valor} {x.extra}
            </div>
            <div className="text-xs text-[var(--muted)]">{x.etiqueta}</div>
          </div>
        ))}
      </div>
      <div className="p-5">
        {vista === "dia" ? (
          <>
            <div className="flex gap-4 text-xs text-[var(--muted)] mb-3">
              <span className="flex items-center gap-1.5"><i className="w-3 h-0.5" style={{ background: PALETA[0] }} /> Vistas</span>
              <span className="flex items-center gap-1.5"><i className="w-3 h-0.5" style={{ background: PALETA[3] }} /> Usuarios</span>
            </div>
            <GraficoDiario serie={d.serie} />
          </>
        ) : (
          <GraficoMensual mensual={d.mensual} />
        )}
      </div>
    </section>
  );
}

function Panel({ d, vivo }: { d: AnalyticsResumen; vivo: AnalyticsTiempoReal | null }) {
  const maxProducto = Math.max(1, ...d.masVistos.map((p) => p.vistas));
  const totalDispositivos = d.dispositivos.reduce((s, x) => s + x.usuarios, 0) || 1;

  return (
    <>
      {/* Fila 1: aviso + indicadores · mapa con las ciudades debajo · países (fase 23d) */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.4fr_1.25fr_0.9fr]">
        <div className="space-y-5 min-w-0">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="flex items-start gap-2.5 px-5 py-3 bg-[var(--warn-soft)] text-[var(--warn)] text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" />
              <span>Solo cuentan las visitas de quienes aceptaron las cookies.</span>
            </div>
            <div className="p-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[15px]">
                  Hoy van <b>{miles(d.hoy.vistas)}</b> vistas de <b>{miles(d.hoy.usuarios)}</b> usuarios
                  {vivo ? (
                    <>
                      {" "}y hay <b>{vivo.activos}</b> en la tienda ahora.
                    </>
                  ) : (
                    "."
                  )}
                </p>
                <a
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
                >
                  Abrir Google Analytics
                </a>
              </div>
              <Activity className="w-14 h-14 text-[var(--accent)] opacity-20 flex-none" aria-hidden="true" />
            </div>
          </section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <TarjetaIndicador titulo="Usuarios" valor={miles(d.kpis.usuarios.actual)} detalle={<Variacion k={d.kpis.usuarios} />} icono={Users} />
            <TarjetaIndicador titulo="Sesiones" valor={miles(d.kpis.sesiones.actual)} detalle={<Variacion k={d.kpis.sesiones} />} icono={Activity} />
            <TarjetaIndicador titulo="Duración media" valor={formatearDuracion(d.kpis.duracionMedia.actual)} detalle={<Variacion k={d.kpis.duracionMedia} />} icono={Clock} />
            <TarjetaIndicador titulo="Rebote" valor={`${d.kpis.rebote.actual.toFixed(1)} %`} detalle={<Variacion k={d.kpis.rebote} inversa />} icono={TrendingDown} tono="aviso" />
          </div>
        </div>

        <TarjetaMapa d={d} />

        <Tarjeta titulo="Usuarios por país" cuerpo="flex flex-col">
          {d.paises.length === 0 ? (
            <SinDatos />
          ) : (
            <BarrasPaises
              filas={d.paises.slice(0, MAX_PAISES).map((p) => ({
                clave: p.codigo || "?",
                valor: p.usuarios,
                etiqueta: `${bandera(p.codigo)} ${nombrePais(p.codigo)}`,
              }))}
              resto={Math.max(0, d.paises.length - MAX_PAISES)}
            />
          )}
        </Tarjeta>
      </div>

      {/* Fila 2: audiencia (por día o por mes) · productos más vistos */}
      <div className="grid gap-5 xl:grid-cols-2">
        <TarjetaAudiencia d={d} />

        <Tarjeta titulo="Productos más vistos" extra={<span className="text-xs text-[var(--muted)]">Vistas de la ficha</span>}>
          {d.masVistos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Aún no hay vistas de productos en este periodo.</p>
          ) : (
            <ol className="space-y-3">
              {d.masVistos.map((p, i) => (
                <li key={p.productoId} className="text-sm">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center text-xs font-bold flex-none">{i + 1}</span>
                    <Link href={p.href} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate hover:text-[var(--accent)]">
                      {p.nombre}
                    </Link>
                    <b>{miles(p.vistas)}</b>
                  </div>
                  <div className="ml-9 h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.vistas / maxProducto) * 100}%`, background: PALETA[i % PALETA.length] }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Tarjeta>
      </div>

      {/* Fila 3: dispositivos · fuentes · páginas */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta titulo="Usuarios por dispositivo">
          {d.dispositivos.length === 0 ? (
            <SinDatos />
          ) : (
            <>
              <Anillo partes={d.dispositivos.map((x, i) => ({ valor: x.usuarios, color: PALETA[i % PALETA.length], etiqueta: x.tipo }))} />
              <ul className="mt-5 space-y-3 text-sm">
                {d.dispositivos.map((x, i) => (
                  <li key={x.tipo} className="flex items-center gap-3">
                    <i className="w-3 h-3 rounded-sm flex-none" style={{ background: PALETA[i % PALETA.length] }} />
                    <span className="flex-1 font-medium">{x.tipo}</span>
                    <span className="text-[var(--muted)]">{miles(x.usuarios)} · {Math.round((x.usuarios / totalDispositivos) * 100)} %</span>
                    <Flecha v={x.variacion} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tarjeta>

        <Tarjeta titulo="De dónde llegan">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Sesiones del periodo</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold">{miles(d.kpis.sesiones.actual)}</span>
            <Flecha v={d.kpis.sesiones.variacion} />
          </div>
          {d.fuentes.length === 0 ? (
            <div className="mt-4"><SinDatos /></div>
          ) : (
            <>
              <div className="mt-5 flex h-3 rounded-full overflow-hidden" role="img" aria-label="Reparto de sesiones por fuente">
                {d.fuentes.map((f, i) => (
                  <span key={f.fuente} style={{ width: `${f.porcentaje}%`, background: PALETA[i % PALETA.length] }} />
                ))}
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                {d.fuentes.map((f, i) => (
                  <li key={f.fuente} className="flex items-center gap-3">
                    <i className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: PALETA[i % PALETA.length] }} />
                    <span className="flex-1 truncate text-[var(--muted)]">{f.fuente}</span>
                    <b>{f.porcentaje.toFixed(1)} %</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tarjeta>

        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm min-w-0">
          <div className="px-5 py-4 border-b border-[var(--line)]">
            <h2 className="font-semibold text-[16px]">Páginas más vistas</h2>
          </div>
          {d.paginas.length === 0 ? (
            <div className="p-5"><SinDatos /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] bg-[var(--bg)]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Página</th>
                  <th className="px-3 py-2.5 font-medium text-right">Vistas</th>
                  <th className="px-5 py-2.5 font-medium text-right">Usuarios</th>
                </tr>
              </thead>
              <tbody>
                {d.paginas.map((p) => (
                  <tr key={p.ruta} className="border-t border-[var(--line)]">
                    <td className="px-5 py-2.5 max-w-[200px] truncate" title={p.ruta}>{p.ruta}</td>
                    <td className="px-3 py-2.5 text-right">{miles(p.vistas)}</td>
                    <td className="px-5 py-2.5 text-right">{p.porcentaje.toFixed(1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Datos de Google Analytics. Los periodos terminan ayer, igual que en Google Analytics. Actualizado{" "}
        {new Date(d.actualizado).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}.
      </p>
    </>
  );
}

type Estado =
  | { tipo: "cargando" }
  | { tipo: "ok"; datos: AnalyticsResumen }
  | { tipo: "sin-conexion" }
  | { tipo: "error"; texto: string };

export default function EstadisticasPage() {
  const { puede } = useAdminSession();
  const permitido = puede("estadisticas.ver");
  const [rango, setRango] = useState<RangoAnalytics>("28d");
  const [estado, setEstado] = useState<{ rango: RangoAnalytics; e: Estado } | null>(null);
  const [vivo, setVivo] = useState<AnalyticsTiempoReal | null>(null);

  useEffect(() => {
    if (!permitido) return;
    let activo = true;
    fetch(`/api/admin/analytics?rango=${rango}`)
      .then(async (res) => {
        const cuerpo: unknown = await res.json().catch(() => null);
        if (!activo) return;
        if (res.ok) setEstado({ rango, e: { tipo: "ok", datos: cuerpo as AnalyticsResumen } });
        else if (res.status === 503) setEstado({ rango, e: { tipo: "sin-conexion" } });
        else {
          const texto =
            cuerpo && typeof cuerpo === "object" && "error" in cuerpo && typeof cuerpo.error === "string"
              ? cuerpo.error
              : "No se pudieron cargar las estadísticas";
          setEstado({ rango, e: { tipo: "error", texto } });
        }
      })
      .catch(() => {
        if (activo) setEstado({ rango, e: { tipo: "error", texto: "Error de conexión" } });
      });
    return () => {
      activo = false;
    };
  }, [permitido, rango]);

  // Tiempo real: al entrar y cada minuto.
  useEffect(() => {
    if (!permitido) return;
    let activo = true;
    const cargar = () =>
      fetch("/api/admin/analytics/realtime")
        .then((res) => (res.ok ? res.json() : null))
        .then((d: AnalyticsTiempoReal | null) => {
          if (activo && d) setVivo(d);
        })
        .catch(() => undefined);
    cargar();
    const id = window.setInterval(cargar, 60_000);
    return () => {
      activo = false;
      window.clearInterval(id);
    };
  }, [permitido]);

  if (!permitido) {
    return (
      <Seccion titulo="Estadísticas">
        <p className="text-[var(--muted)]">Solo el superadmin puede ver las estadísticas.</p>
      </Seccion>
    );
  }

  const e: Estado = estado?.rango === rango ? estado.e : { tipo: "cargando" };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[17px] font-bold uppercase tracking-wide">Estadísticas</h1>
        <div className="flex items-center gap-3">
          {vivo && (
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[var(--ok-soft)] text-[var(--ok)] px-3 py-1 text-xs font-semibold">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-[var(--ok)] opacity-60 animate-ping motion-reduce:hidden" />
                <span className="relative w-2 h-2 rounded-full bg-[var(--ok)]" />
              </span>
              {vivo.activos} ahora
            </span>
          )}
          <div className="flex gap-1.5" role="tablist" aria-label="Periodo">
            {RANGOS.map((r) => (
              <button
                key={r.valor}
                role="tab"
                aria-selected={rango === r.valor}
                onClick={() => setRango(r.valor)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  rango === r.valor ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95"
                }`}
              >
                {r.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      {e.tipo === "cargando" && <p className="text-[var(--muted)]">Cargando estadísticas…</p>}
      {e.tipo === "sin-conexion" && <SinConexion />}
      {e.tipo === "error" && <p role="alert" className="text-red-600">{e.texto}</p>}
      {e.tipo === "ok" && <Panel d={e.datos} vivo={vivo} />}
    </div>
  );
}
