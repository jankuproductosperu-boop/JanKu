"use client";
import Link from "next/link";
import { Package, FolderTree, Sparkles, AlertCircle, ArrowRight, Plus, Image as ImageIcon, Tag } from "lucide-react";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

const ACCESOS = [
  { href: "/admin/productos", texto: "Productos", icono: Package },
  { href: "/admin/banners", texto: "Banners", icono: ImageIcon },
  { href: "/admin/promociones", texto: "Promociones", icono: Sparkles },
  { href: "/admin/descuentos", texto: "Descuentos", icono: Tag },
];

// Chips de icono con el azul de la tienda (D-70)
const CHIP_AZUL = "bg-[var(--navy-soft)] text-[var(--navy-tint)]";
const CHIP_ACENTO = "bg-[var(--accent-soft)] text-[var(--accent)]";

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function AdminResumenPage() {
  const { products, categories, banners, promotions } = useAdminData();
  const { admin } = useAdminSession();

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

  const tarjetas = [
    { titulo: "Productos activos", valor: activos.length, detalle: `${products.length} en total`, icono: Package, color: CHIP_AZUL, href: "/admin/productos" },
    { titulo: "Stock bajo o agotado", valor: criticos.length, detalle: criticos.length ? "Reponer pronto" : "Todo en orden", icono: AlertCircle, color: criticos.length ? "bg-[var(--warn-soft)] text-[var(--warn)]" : "bg-[var(--ok-soft)] text-[var(--ok)]", href: "/admin/inventario" },
    { titulo: "Categorías activas", valor: categories.filter((c) => c.activo).length, detalle: `${categories.length} en total`, icono: FolderTree, color: CHIP_ACENTO, href: "/admin/categorias" },
    { titulo: "Banners y promociones", valor: banners.filter((b) => b.activo).length + promotions.filter((p) => p.activo).length, detalle: `${banners.length} banners · ${promotions.length} promos`, icono: Sparkles, color: CHIP_AZUL, href: "/admin/banners" },
  ];

  const stock = [
    { etiqueta: "Disponible", n: disponibles, barra: "bg-emerald-500", texto: "text-emerald-700" },
    { etiqueta: "Limitado", n: limitados, barra: "bg-amber-500", texto: "text-amber-700" },
    { etiqueta: "Agotado", n: agotados, barra: "bg-red-500", texto: "text-red-700" },
  ];
  const totalStock = Math.max(1, activos.length);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Bienvenida */}
      <section className="rounded-2xl p-6 md:p-8 text-white bg-gradient-to-r from-[#2C2C6C] via-[#3B3A9A] to-[#4F46E5] shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <p className="text-sm text-white/70">{new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{saludo()}{admin?.nombre ? `, ${admin.nombre}` : ""} 👋</h1>
          <p className="text-white/80 mt-1">Esto es lo que hay hoy en tu tienda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/productos" className="inline-flex items-center gap-2 rounded-xl bg-white text-[#2C2C6C] px-4 py-2.5 text-sm font-bold hover:bg-indigo-50 transition shadow">
            <Plus className="w-4 h-4" /> Nuevo producto
          </Link>
          <Link href="/admin/banners" className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/25 transition">
            <ImageIcon className="w-4 h-4" /> Nuevo banner
          </Link>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href} className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition min-w-0">
            <div className="flex items-start justify-between">
              <span className={`w-11 h-11 rounded-xl grid place-items-center transition group-hover:scale-105 ${t.color}`}><t.icono className="w-5 h-5" /></span>
              <ArrowRight className="w-4 h-4 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="mt-3 text-3xl font-bold leading-tight tracking-tight">{t.valor}</div>
            <div className="text-sm font-medium text-[var(--ink)]">{t.titulo}</div>
            <div className="text-xs text-[var(--muted)]">{t.detalle}</div>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Estado de stock */}
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
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
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
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
                    <div className="h-full rounded-full bg-gradient-to-r from-[#3B3A9A] to-[var(--accent)]" style={{ width: `${(c.total / maxCategoria) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Stock crítico */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
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
            <span className="w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-[#2C2C6C] to-[#4F46E5] shadow-md transition group-hover:scale-105"><a.icono className="w-5 h-5" /></span>
            <span className="font-semibold text-sm">{a.texto}</span>
            <ArrowRight className="w-4 h-4 ml-auto text-[var(--muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
          </Link>
        ))}
      </section>
    </div>
  );
}
