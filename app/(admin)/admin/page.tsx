"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, FolderTree, Sparkles, AlertCircle, ArrowRight, Plus, Image as ImageIcon, Tag, BookOpen, Eye } from "lucide-react";
import type { AnalyticsResumen } from "@/types";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";
import { PageHeader, TarjetaIndicador, type Tono } from "@/app/(admin)/admin/_components/ui";

const ACCESOS = [
  { href: "/admin/productos", texto: "Productos", icono: Package },
  { href: "/admin/banners", texto: "Banners", icono: ImageIcon },
  { href: "/admin/promociones", texto: "Promociones", icono: Sparkles },
  { href: "/admin/descuentos", texto: "Descuentos", icono: Tag },
];


function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function AdminResumenPage() {
  const { products, categories, banners, promotions } = useAdminData();
  const { admin, puede } = useAdminSession();

  // Q7 (fase 22b): reclamos por responder, solo con `pedidos.ver` y con datos reales (D-52).
  const verReclamos = puede("pedidos.ver");
  const [reclamosPendientes, setReclamosPendientes] = useState<number | null>(null);
  useEffect(() => {
    if (!verReclamos) return;
    let activo = true;
    fetch("/api/admin/complaints?estado=pendiente&pageSize=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((datos: { total?: unknown } | null) => {
        if (activo && datos && typeof datos.total === "number") setReclamosPendientes(datos.total);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [verReclamos]);

  // Fase 23b: visitas de hoy y más vistos de la semana (solo superadmin). Sin conexión con Google, no se muestra nada.
  const verEstadisticas = puede("estadisticas.ver");
  const [semana, setSemana] = useState<AnalyticsResumen | null>(null);
  useEffect(() => {
    if (!verEstadisticas) return;
    let activo = true;
    fetch("/api/admin/analytics?rango=7d")
      .then((res) => (res.ok ? res.json() : null))
      .then((d: AnalyticsResumen | null) => {
        if (activo && d && d.hoy) setSemana(d);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [verEstadisticas]);

  const activos = products.filter((p) => p.activo !== false);
  const disponibles = activos.filter((p) => p.stock === "Disponible" || !p.stock).length;
  const limitados = activos.filter((p) => p.stock === "Limitado").length;
  const agotados = activos.filter((p) => p.stock === "Agotado").length;
  const criticos = activos
    .filter((p) => p.stock === "Limitado" || p.stock === "Agotado")
    .sort((a, b) => Number(b.stock === "Agotado") - Number(a.stock === "Agotado"));

  const porCategoria = categories
    .map((c) => ({ nombre: c.nombre, total: activos.filter((p) => p.categoriaSlugs?.includes(c.slug)).length }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxCategoria = Math.max(1, ...porCategoria.map((c) => c.total));

  const tarjetas: { titulo: string; valor: number; detalle: string; icono: typeof Package; tono: Tono; href: string }[] = [
    { titulo: "Productos activos", valor: activos.length, detalle: `${products.length} en total`, icono: Package, tono: "acento", href: "/admin/productos" },
    { titulo: "Stock bajo o agotado", valor: criticos.length, detalle: criticos.length ? "Reponer pronto" : "Todo en orden", icono: AlertCircle, tono: criticos.length ? "aviso" : "ok", href: "/admin/inventario" },
    { titulo: "Categorías activas", valor: categories.filter((c) => c.activo).length, detalle: `${categories.length} en total`, icono: FolderTree, tono: "acento", href: "/admin/categorias" },
    { titulo: "Banners y promociones", valor: banners.filter((b) => b.activo).length + promotions.filter((p) => p.activo).length, detalle: `${banners.length} banners · ${promotions.length} promos`, icono: Sparkles, tono: "acento", href: "/admin/banners" },
  ];
  // Q7 de la 22b: la tarjeta de reclamos solo con `pedidos.ver` y cuando ya hay dato real.
  if (verReclamos && reclamosPendientes !== null) {
    tarjetas.push({
      titulo: "Reclamos por responder",
      valor: reclamosPendientes,
      detalle: reclamosPendientes > 0 ? "Plazo máximo: 15 días hábiles" : "Todo respondido",
      icono: BookOpen,
      tono: reclamosPendientes > 0 ? "aviso" : "ok",
      href: "/admin/reclamos",
    });
  }
  const hoy = semana?.hoy;
  if (verEstadisticas && hoy) {
    tarjetas.push({
      titulo: "Visitas hoy",
      valor: hoy.vistas,
      detalle: `${hoy.usuarios} usuarios · Google Analytics`,
      icono: Eye,
      tono: "acento",
      href: "/admin/estadisticas",
    });
  }
  const COLUMNAS: Record<number, string> = { 4: "lg:grid-cols-4", 5: "lg:grid-cols-3 xl:grid-cols-5", 6: "lg:grid-cols-3" };

  const stock = [
    { etiqueta: "Disponible", n: disponibles, barra: "bg-emerald-500", texto: "text-emerald-700" },
    { etiqueta: "Limitado", n: limitados, barra: "bg-amber-500", texto: "text-amber-700" },
    { etiqueta: "Agotado", n: agotados, barra: "bg-red-500", texto: "text-red-700" },
  ];
  const totalStock = Math.max(1, activos.length);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Bienvenida */}
      <PageHeader titulo="Resumen" />

      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-[var(--accent-soft)] text-sm text-[var(--accent)] font-medium">
          {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{saludo()}{admin?.nombre ? `, ${admin.nombre}` : ""}</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">Esto es lo que hay hoy en tu tienda.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/productos" className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition">
              <Plus className="w-4 h-4" /> Nuevo producto
            </Link>
            <Link href="/admin/banners" className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--bg)] transition">
              <ImageIcon className="w-4 h-4" /> Nuevo banner
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${COLUMNAS[tarjetas.length] ?? "lg:grid-cols-4"}`}>
        {tarjetas.map((t) => (
          <TarjetaIndicador key={t.titulo} titulo={t.titulo} valor={t.valor} detalle={t.detalle} icono={t.icono} tono={t.tono} href={t.href} />
        ))}
      </section>

      {/* Más vistos esta semana (fase 23b) */}
      {verEstadisticas && semana && semana.masVistos.length > 0 && (
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold">Más vistos esta semana</h2>
              <p className="text-xs text-[var(--muted)]">Vistas de la ficha del producto en los últimos 7 días</p>
            </div>
            <Link href="/admin/estadisticas" className="text-sm font-semibold text-[var(--accent)] hover:underline">Ver estadísticas →</Link>
          </div>
          <ol>
            {semana.masVistos.slice(0, 5).map((p, i) => (
              <li key={p.productoId} className="flex items-center gap-3 py-2.5 border-t border-[var(--line)] first:border-t-0 text-sm">
                <span className="w-6 text-center font-bold text-[var(--muted)]">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate font-semibold">{p.nombre}</span>
                <b>{p.vistas.toLocaleString("es-PE")}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Estado de stock */}
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="font-bold">Estado de stock</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Productos activos según su disponibilidad</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-[var(--line)] mb-4" role="img" aria-label="Distribución de stock">
            {stock.map((s) => <div key={s.etiqueta} className={s.barra} style={{ width: `${(s.n / totalStock) * 100}%` }} />)}
          </div>
          <div className="space-y-2">
            {stock.map((s) => (
              <div key={s.etiqueta} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><i className={`w-2.5 h-2.5 rounded-full ${s.barra}`} />{s.etiqueta}</span>
                <b className={s.texto}>{s.n}</b>
              </div>
            ))}
          </div>
        </section>

        {/* Productos por categoría */}
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="font-bold">Productos por categoría</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Las 6 categorías con más productos activos</p>
          {porCategoria.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-4">Aún no hay productos en categorías.</p>
          ) : (
            <div className="space-y-3">
              {porCategoria.map((c) => (
                <div key={c.nombre}>
                  <div className="flex justify-between text-sm mb-1"><span className="truncate pr-2">{c.nombre}</span><b>{c.total}</b></div>
                  <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#263070] to-[var(--accent)]" style={{ width: `${(c.total / maxCategoria) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Stock crítico */}
      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold">Stock crítico</h2>
            <p className="text-xs text-[var(--muted)]">Productos activos con stock limitado o agotado</p>
          </div>
          <Link href="/admin/inventario" className="text-sm font-semibold text-[var(--accent)] hover:underline">Ir a Inventario →</Link>
        </div>
        {criticos.length === 0 ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">✅ No hay productos con stock crítico.</p>
        ) : (
          <ul>
            {criticos.slice(0, 8).map((p) => (
              <li key={p._id} className="flex items-center gap-3 py-2.5 border-t border-[var(--line)] first:border-t-0">
                <span className={`w-2 h-2 rounded-full flex-none ${p.stock === "Agotado" ? "bg-red-500" : "bg-amber-500"}`} />
                <span className="flex-1 min-w-0 truncate font-semibold">{p.nombre}</span>
                {typeof p.stockCantidad === "number" && (
                  <small className="text-[var(--muted)]">
                    {p.stockCantidad}
                    {typeof p.stockMinimo === "number" ? ` de ${p.stockMinimo}` : ""} unid.
                  </small>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.stock === "Agotado" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {p.stock}
                </span>
              </li>
            ))}
          </ul>
        )}
        {criticos.length > 8 && <p className="mt-3 text-sm text-[var(--muted)]">y {criticos.length - 8} más en Inventario.</p>}
      </section>

      {/* Accesos rápidos */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACCESOS.map((a) => (
          <Link key={a.href} href={a.href} className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
            <span className="w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-[#263070] to-[var(--accent)] shadow-md transition group-hover:scale-105"><a.icono className="w-5 h-5" /></span>
            <span className="font-semibold text-sm">{a.texto}</span>
            <ArrowRight className="w-4 h-4 ml-auto text-[var(--muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
          </Link>
        ))}
      </section>
    </div>
  );
}
