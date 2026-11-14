"use client";
import Link from "next/link";
import { Package, FolderTree, Sparkles, AlertCircle } from "lucide-react";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";

const ACCESOS: [string, string][] = [
  ["/admin/productos", "Productos"],
  ["/admin/banners", "Banners"],
  ["/admin/promociones", "Promociones"],
  ["/admin/descuentos", "Descuentos"],
];

export default function AdminResumenPage() {
  const { products, categories, banners, promotions } = useAdminData();

  const activos = products.filter((p) => p.activo !== false);
  const criticos = activos
    .filter((p) => p.stock === "Limitado" || p.stock === "Agotado")
    .sort((a, b) => Number(b.stock === "Agotado") - Number(a.stock === "Agotado"));

  const tarjetas = [
    { titulo: "Productos activos", valor: activos.length, detalle: `${products.length} en total`, icono: Package, href: "/admin/productos" },
    { titulo: "Stock bajo o agotado", valor: criticos.length, detalle: criticos.length ? "Reponer pronto" : "Todo en orden", icono: AlertCircle, href: "/admin/inventario" },
    { titulo: "Categorías activas", valor: categories.filter((c) => c.activo).length, detalle: `${categories.length} en total`, icono: FolderTree, href: "/admin/categorias" },
    { titulo: "Banners y promociones activos", valor: banners.filter((b) => b.activo).length + promotions.filter((p) => p.activo).length, detalle: `${banners.length} banners · ${promotions.length} promociones`, icono: Sparkles, href: "/admin/banners" },
  ];

  return (
    <Seccion titulo="Resumen">
      <p className="-mt-4 text-[var(--muted)]">Esto es lo que hay hoy en tu tienda.</p>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href} className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-4 hover:shadow-md transition min-w-0">
            <div className="flex items-center justify-between text-[var(--muted)]">
              <small>{t.titulo}</small>
              <t.icono className="w-4 h-4" />
            </div>
            <div className="text-[28px] font-bold leading-tight tracking-tight">{t.valor}</div>
            <div className="text-[12.5px] font-semibold text-[var(--muted)]">{t.detalle}</div>
          </Link>
        ))}
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="text-[15px] font-bold">Stock crítico</h2>
        <p className="text-[12.5px] text-[var(--muted)] mb-3">Productos activos con stock limitado o agotado</p>
        {criticos.length === 0 ? (
          <p className="text-sm text-[var(--muted)] py-4">No hay productos con stock crítico.</p>
        ) : (
          <ul>
            {criticos.slice(0, 8).map((p) => (
              <li key={p._id} className="flex items-center gap-3 py-2.5 border-t border-[var(--line)] first:border-t-0">
                <span className="flex-1 min-w-0 truncate font-semibold">{p.nombre}</span>
                {typeof p.stockCantidad === "number" && (
                  <small className="text-[var(--muted)]">
                    {p.stockCantidad}
                    {typeof p.stockMinimo === "number" ? ` de ${p.stockMinimo}` : ""} unid.
                  </small>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.stock === "Agotado" ? "bg-[var(--bad-soft)] text-[var(--bad)]" : "bg-[var(--warn-soft)] text-[var(--warn)]"}`}>
                  {p.stock}
                </span>
              </li>
            ))}
          </ul>
        )}
        {criticos.length > 8 && (
          <Link href="/admin/inventario" className="mt-3 inline-block text-sm font-semibold text-[var(--accent)]">
            Ver los {criticos.length} en Inventario →
          </Link>
        )}
      </section>

      <section className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="text-[15px] font-bold mb-3">Accesos rápidos</h2>
        <div className="flex flex-wrap gap-2">
          {ACCESOS.map(([href, texto]) => (
            <Link key={href} href={href} className="rounded-[10px] border border-[var(--line)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--bg)] transition">
              {texto}
            </Link>
          ))}
        </div>
      </section>
    </Seccion>
  );
}
