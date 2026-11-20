"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Clock, Eye, TrendingDown, Users } from "lucide-react";
import type { AnalyticsResumen, AnalyticsTiempoReal, KpiAnalytics, RangoAnalytics } from "@/types";
import { formatearDuracion } from "@/lib/analytics";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { TarjetaIndicador } from "@/app/(admin)/admin/_components/ui";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

// Estadísticas de Google Analytics (fase 23b). Solo superadmin. Las cifras solo cuentan a quien
// aceptó las cookies (D-75), así que sirven para comparar, no como conteo exacto (D-86).

const RANGOS: { valor: RangoAnalytics; etiqueta: string }[] = [
  { valor: "7d", etiqueta: "7 días" },
  { valor: "28d", etiqueta: "28 días" },
  { valor: "90d", etiqueta: "90 días" },
];

const miles = (n: number) => n.toLocaleString("es-PE");
const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

function Variacion({ k, inversa = false }: { k: KpiAnalytics; inversa?: boolean }) {
  if (k.variacion === null) return <span>Sin periodo anterior para comparar</span>;
  // En el rebote, bajar es bueno.
  const bueno = inversa ? k.variacion <= 0 : k.variacion >= 0;
  return (
    <span>
      <b className={bueno ? "text-[var(--ok)]" : "text-[var(--bad)]"}>
        {k.variacion > 0 ? "↑" : k.variacion < 0 ? "↓" : "="} {Math.abs(k.variacion).toFixed(1)} %
      </b>{" "}
      frente al periodo anterior
    </span>
  );
}

function Bloque({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
        <h2 className="font-semibold">{titulo}</h2>
        {extra}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Gráfico de líneas propio: vistas y usuarios por día. */
function GraficoDiario({ serie }: { serie: AnalyticsResumen["serie"] }) {
  const W = 800;
  const H = 260;
  const m = { izq: 44, der: 12, arr: 12, aba: 28 };
  const max = Math.max(1, ...serie.map((p) => Math.max(p.vistas, p.usuarios)));
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  const tope = Math.ceil(max / paso) * paso;
  const x = (i: number) => m.izq + (serie.length <= 1 ? 0 : (i * (W - m.izq - m.der)) / (serie.length - 1));
  const y = (v: number) => H - m.aba - (v / tope) * (H - m.arr - m.aba);
  const linea = (campo: "vistas" | "usuarios") => serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[campo]).toFixed(1)}`).join(" ");
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(tope * f));
  const cadaX = Math.max(1, Math.ceil(serie.length / 7));

  return (
    <div>
      <div className="flex gap-4 text-xs text-[var(--muted)] mb-2">
        <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-[var(--accent)]" /> Vistas de página</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-[var(--ok)]" /> Usuarios</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Vistas y usuarios por día">
        {marcas.map((v) => (
          <g key={v}>
            <line x1={m.izq} x2={W - m.der} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={m.izq - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{miles(v)}</text>
          </g>
        ))}
        {serie.map((p, i) =>
          i % cadaX === 0 || i === serie.length - 1 ? (
            <text key={p.fecha} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{fechaCorta(p.fecha)}</text>
          ) : null,
        )}
        <path d={linea("vistas")} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={linea("usuarios")} fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinejoin="round" />
        {serie.map((p, i) => (
          <circle key={p.fecha} cx={x(i)} cy={y(p.vistas)} r={serie.length > 40 ? 0 : 3} fill="var(--accent)">
            <title>{`${fechaCorta(p.fecha)}: ${miles(p.vistas)} vistas, ${miles(p.usuarios)} usuarios`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function Barras({ filas }: { filas: { etiqueta: string; valor: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (!filas.length) return <p className="text-sm text-[var(--muted)]">Aún no hay datos en este periodo.</p>;
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.etiqueta}>
          <div className="flex justify-between text-sm mb-1">
            <span className="truncate pr-3">{f.etiqueta}</span>
            <b>{miles(f.valor)}</b>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
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
    <Seccion titulo="Estadísticas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Periodo">
          {RANGOS.map((r) => (
            <button
              key={r.valor}
              role="tab"
              aria-selected={rango === r.valor}
              onClick={() => setRango(r.valor)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold border transition ${
                rango === r.valor
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--bg)]"
              }`}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
        {vivo && (
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ok-soft)] text-[var(--ok)] px-3.5 py-1.5 text-sm font-semibold">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-[var(--ok)] opacity-60 animate-ping motion-reduce:hidden" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-[var(--ok)]" />
            </span>
            {vivo.activos} en la tienda ahora
          </span>
        )}
      </div>

      {e.tipo === "cargando" && <p className="text-[var(--muted)]">Cargando estadísticas…</p>}
      {e.tipo === "sin-conexion" && <SinConexion />}
      {e.tipo === "error" && <p role="alert" className="text-red-600">{e.texto}</p>}

      {e.tipo === "ok" && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <TarjetaIndicador titulo="Usuarios" valor={miles(e.datos.kpis.usuarios.actual)} detalle={<Variacion k={e.datos.kpis.usuarios} />} icono={Users} />
            <TarjetaIndicador titulo="Sesiones" valor={miles(e.datos.kpis.sesiones.actual)} detalle={<Variacion k={e.datos.kpis.sesiones} />} icono={Activity} />
            <TarjetaIndicador titulo="Vistas de página" valor={miles(e.datos.kpis.vistas.actual)} detalle={<Variacion k={e.datos.kpis.vistas} />} icono={Eye} />
            <TarjetaIndicador titulo="Duración media" valor={formatearDuracion(e.datos.kpis.duracionMedia.actual)} detalle={<Variacion k={e.datos.kpis.duracionMedia} />} icono={Clock} />
            <TarjetaIndicador titulo="Rebote" valor={`${e.datos.kpis.rebote.actual.toFixed(1)} %`} detalle={<Variacion k={e.datos.kpis.rebote} inversa />} icono={TrendingDown} tono="aviso" />
          </section>

          <Bloque titulo="Visitas por día">
            <GraficoDiario serie={e.datos.serie} />
          </Bloque>

          <div className="grid gap-4 lg:grid-cols-2">
            <Bloque titulo="Productos más vistos">
              {e.datos.masVistos.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Aún no hay vistas de productos en este periodo.</p>
              ) : (
                <ol className="divide-y divide-[var(--line)]">
                  {e.datos.masVistos.map((p, i) => (
                    <li key={p.productoId} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-6 text-center font-bold text-[var(--muted)]">{i + 1}</span>
                      <Link href={p.href} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate hover:text-[var(--accent)]">
                        {p.nombre}
                      </Link>
                      <b>{miles(p.vistas)}</b>
                    </li>
                  ))}
                </ol>
              )}
            </Bloque>
            <Bloque titulo="Páginas más vistas">
              <Barras filas={e.datos.paginas.map((p) => ({ etiqueta: p.ruta, valor: p.vistas }))} />
            </Bloque>
            <Bloque titulo="De dónde llegan">
              <Barras filas={e.datos.origenes.map((o) => ({ etiqueta: o.canal, valor: o.sesiones }))} />
            </Bloque>
            <Bloque titulo="Dispositivos">
              <Barras filas={e.datos.dispositivos.map((d) => ({ etiqueta: d.tipo, valor: d.usuarios }))} />
            </Bloque>
          </div>

          <p className="text-xs text-[var(--muted)]">
            Datos de Google Analytics. Solo cuentan las visitas de quienes aceptaron las cookies, así que son menores que las
            reales: sirven para comparar días y productos. Google tarda unas horas en procesar el día. Actualizado{" "}
            {new Date(e.datos.actualizado).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}.
          </p>
        </>
      )}
    </Seccion>
  );
}
