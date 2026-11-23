"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Download, Pencil, LayoutGrid, List } from "lucide-react";
import { invalidateCachePattern } from "@/lib/cache";
import type { ProductAdmin, Category } from "@/types";
import { esNovedad, fechaNuevoHasta } from "@/lib/novedades";
import { Chip, Switch } from "@/app/(admin)/admin/_components/ui";
import { getCloudinaryUrl } from "@/app/(admin)/admin/_components/imageTypes";

type Props = {
  products: ProductAdmin[];
  categories: Category[];
  onReload: () => Promise<void>;
  busquedaInicial?: string;
};

type Vista = "lista" | "iconos";
type Orden = "recientes" | "nombre" | "precio-asc" | "precio-desc";

const ITEMS_PER_PAGE = 20;
const CLAVE_VISTA = "admin-productos-vista";

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function exportarCSV(products: ProductAdmin[], categories: Category[]) {
  const catNombre = (slugs?: string[]) =>
    (slugs || []).map((s) => categories.find((c) => c.slug === s)?.nombre || s).join(" | ");
  const headers = ["Código", "Nombre", "Categoría", "Precio", "Stock", "Activo"];
  const rows = products.map((p) => [
    p.codigo || "",
    p.nombre,
    catNombre(p.categoriaSlugs),
    p.precio.toFixed(2),
    p.stock || "",
    p.activo === false ? "No" : "Sí",
  ]);
  // Excel en configuración regional español espera ";" como separador de columnas.
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `productos-janku-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProductosLista({ products, categories, onReload, busquedaInicial = "" }: Props) {
  const [q, setQ] = useState(busquedaInicial);
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [stock, setStock] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [trabajando, setTrabajando] = useState(false);
  const [vista, setVista] = useState<Vista>(() => {
    try { return localStorage.getItem(CLAVE_VISTA) === "iconos" ? "iconos" : "lista"; } catch { return "lista"; }
  });
  const cambiarVista = (v: Vista) => {
    setVista(v);
    try { localStorage.setItem(CLAVE_VISTA, v); } catch { /* sin almacenamiento: la vista no se recuerda */ }
  };

  // ── Filtrado, orden y paginación (todo en el navegador) ──
  const consulta = normalizar(q.trim());
  const filtrados = products
    .filter((p) => !categoria || p.categoriaSlugs?.includes(categoria))
    .filter((p) => estado === "todos" || (estado === "activos" ? p.activo !== false : p.activo === false))
    .filter((p) => !stock || p.stock === stock)
    .filter((p) => {
      if (!consulta) return true;
      const texto = normalizar([p.nombre, p.codigo || "", ...(p.tags || [])].join(" "));
      return texto.includes(consulta);
    })
    .sort((a, b) => {
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      if (orden === "precio-asc") return a.precio - b.precio;
      if (orden === "precio-desc") return b.precio - a.precio;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginaActual = Math.min(pagina, totalPages);
  const visibles = filtrados.slice((paginaActual - 1) * ITEMS_PER_PAGE, paginaActual * ITEMS_PER_PAGE);

  const cambiarFiltro = (fn: () => void) => { fn(); setPagina(1); setSeleccion(new Set()); };

  // ── Selección ──
  const todosMarcados = visibles.length > 0 && visibles.every((p) => seleccion.has(p._id));
  const alternarTodos = () => {
    const nuevo = new Set(seleccion);
    if (todosMarcados) visibles.forEach((p) => nuevo.delete(p._id));
    else visibles.forEach((p) => nuevo.add(p._id));
    setSeleccion(nuevo);
  };
  const alternarUno = (id: string) => {
    const nuevo = new Set(seleccion);
    if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
    setSeleccion(nuevo);
  };

  // ── Cambios (usan el PUT parcial existente; sin endpoint nuevo) ──
  const actualizar = async (id: string, cambios: Record<string, unknown>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    return res.ok;
  };

  const aplicarMasivo = async (cambios: Record<string, unknown>) => {
    setTrabajando(true);
    let ok = 0;
    let fallos = 0;
    for (const id of seleccion) {
      try {
        if (await actualizar(id, cambios)) ok++; else fallos++;
      } catch { fallos++; }
    }
    invalidateCachePattern("products");
    setSeleccion(new Set());
    await onReload();
    setTrabajando(false);
    alert(`${ok} actualizado${ok !== 1 ? "s" : ""}${fallos ? `, ${fallos} con error` : ""}`);
  };

  const cambiarCategoriaMasivo = (slug: string) => {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) return;
    if (!confirm(`¿Asignar la categoría «${cat.nombre}» a ${seleccion.size} producto(s)? Reemplaza las categorías que tengan.`)) return;
    aplicarMasivo({ categorias: [cat.nombre], categoriaSlugs: [cat.slug] });
  };

  const alternarActivo = async (p: ProductAdmin) => {
    try {
      if (!(await actualizar(p._id, { activo: p.activo === false }))) { alert("Error: no se pudo actualizar el producto"); return; }
      invalidateCachePattern("products");
      await onReload();
    } catch { alert("Error de conexión al actualizar el producto"); }
  };

  const claseSelect = "rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {products.length} productos · {products.filter((p) => p.activo !== false).length} activos
        </p>
        <div className="flex gap-2">
          <button onClick={() => exportarCSV(filtrados, categories)} className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--bg)] transition">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <Link href="/admin/productos/nuevo" className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Nuevo producto
          </Link>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 flex-1 min-w-[220px] max-w-[360px]">
          <Search className="w-4 h-4 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => cambiarFiltro(() => setQ(e.target.value))}
            placeholder="Buscar por nombre, etiqueta o código"
            className="w-full bg-transparent outline-none text-sm"
          />
        </label>
        <select aria-label="Categoría" value={categoria} onChange={(e) => cambiarFiltro(() => setCategoria(e.target.value))} className={claseSelect}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c._id} value={c.slug}>{c.nombre}</option>)}
        </select>
        <select aria-label="Estado" value={estado} onChange={(e) => cambiarFiltro(() => setEstado(e.target.value as typeof estado))} className={claseSelect}>
          <option value="todos">Activos e inactivos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
        <select aria-label="Stock" value={stock} onChange={(e) => cambiarFiltro(() => setStock(e.target.value))} className={claseSelect}>
          <option value="">Todo el stock</option>
          <option value="Disponible">Disponible</option>
          <option value="Limitado">Limitado</option>
          <option value="Agotado">Agotado</option>
        </select>
        <select aria-label="Orden" value={orden} onChange={(e) => cambiarFiltro(() => setOrden(e.target.value as Orden))} className={claseSelect}>
          <option value="recientes">Más recientes</option>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
        </select>
        <div className="inline-flex rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-0.5" role="group" aria-label="Tipo de vista">
          {([["lista", "Lista", List], ["iconos", "Iconos", LayoutGrid]] as const).map(([v, texto, Icono]) => (
            <button key={v} onClick={() => cambiarVista(v)} aria-pressed={vista === v} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${vista === v ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--bg)]"}`}>
              <Icono className="w-4 h-4" /> {texto}
            </button>
          ))}
        </div>
      </div>

      {/* Acciones masivas */}
      {seleccion.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-[var(--accent-soft)] px-3 py-2">
          <b className="text-sm">{seleccion.size} seleccionado{seleccion.size !== 1 ? "s" : ""}</b>
          <button disabled={trabajando} onClick={() => aplicarMasivo({ activo: true })} className="rounded-lg bg-[var(--surface)] border border-[var(--line)] px-3 py-1 text-sm font-semibold disabled:opacity-50">Activar</button>
          <button disabled={trabajando} onClick={() => aplicarMasivo({ activo: false })} className="rounded-lg bg-[var(--surface)] border border-[var(--line)] px-3 py-1 text-sm font-semibold disabled:opacity-50">Desactivar</button>
          <button disabled={trabajando} onClick={() => aplicarMasivo({ nuevoHasta: fechaNuevoHasta() })} className="rounded-lg bg-[var(--surface)] border border-[var(--line)] px-3 py-1 text-sm font-semibold disabled:opacity-50">Marcar como novedad</button>
          <button disabled={trabajando} onClick={() => aplicarMasivo({ nuevoHasta: null })} className="rounded-lg bg-[var(--surface)] border border-[var(--line)] px-3 py-1 text-sm font-semibold disabled:opacity-50">Quitar novedad</button>
          <select
            aria-label="Cambiar categoría"
            disabled={trabajando}
            value=""
            onChange={(e) => e.target.value && cambiarCategoriaMasivo(e.target.value)}
            className="rounded-lg bg-[var(--surface)] border border-[var(--line)] px-2 py-1 text-sm font-semibold disabled:opacity-50"
          >
            <option value="">Cambiar categoría…</option>
            {categories.map((c) => <option key={c._id} value={c.slug}>{c.nombre}</option>)}
          </select>
          <button onClick={() => setSeleccion(new Set())} className="ml-auto text-sm text-[var(--muted)] hover:underline">Quitar selección</button>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 md:p-4 shadow-sm">
        {products.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)]"><p className="text-lg">No hay productos</p><p className="mt-2 text-sm">¡Agrega tu primer producto!</p></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)]"><p className="text-lg">Ningún producto coincide con la búsqueda</p></div>
        ) : vista === "iconos" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
            {visibles.map((p) => (
              <div key={p._id} className={`relative rounded-none border bg-[var(--surface)] overflow-hidden hover:shadow-lg transition ${seleccion.has(p._id) ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "border-[var(--line)]"} ${p.activo === false ? "opacity-70" : ""}`}>
                <label className="absolute top-2 left-2 z-10 rounded-none bg-[var(--surface)]/90 p-1 shadow">
                  <input type="checkbox" aria-label={`Seleccionar ${p.nombre}`} checked={seleccion.has(p._id)} onChange={() => alternarUno(p._id)} />
                </label>
                {p.activo === false && <span className="absolute top-2 right-2 z-10 rounded-none bg-gray-800/80 px-2 py-0.5 text-[11px] font-semibold text-white">Inactivo</span>}
                <Link href={`/admin/productos/${p._id}`} className="relative block aspect-square bg-[var(--accent-soft)]">
                  {(p.imagenUrl || p.imagenPrincipal) && (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel (D-95)
                    <img src={p.imagenUrl || getCloudinaryUrl(p.imagenPrincipal || "", 300)} alt={p.nombre} className="w-full h-full object-cover" />
                  )}
                  {esNovedad(p) && <span className="absolute bottom-2 left-2 rounded-none bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">Nuevo</span>}
                </Link>
                <div className="p-3 space-y-2">
                  <b className="block text-sm leading-snug line-clamp-2 min-h-[2.5rem]">{p.nombre}</b>
                  {(p.variantes?.length ?? 0) > 0 && <span className="block text-xs text-[var(--accent)] font-semibold">{p.variantes?.length} variantes</span>}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">S/ {p.precio.toFixed(2)}</span>
                    {p.stock && (
                      <Chip tono={p.stock === "Disponible" ? "ok" : p.stock === "Limitado" ? "aviso" : "malo"}>{p.stock}</Chip>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Switch activo={p.activo !== false} etiqueta={`Activo: ${p.nombre}`} onChange={() => alternarActivo(p)} />
                    <Link href={`/admin/productos/${p._id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--bg)] transition">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[12.5px] text-[var(--muted)] border-b border-[var(--line)]">
                  <th className="p-2 w-8"><input type="checkbox" aria-label="Seleccionar todos" checked={todosMarcados} onChange={alternarTodos} /></th>
                  <th className="p-2">Producto</th>
                  <th className="p-2">Categorías</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Activo</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p._id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]">
                    <td className="p-2"><input type="checkbox" aria-label={`Seleccionar ${p.nombre}`} checked={seleccion.has(p._id)} onChange={() => alternarUno(p._id)} /></td>
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] overflow-hidden flex-none grid place-items-center">
                          {(p.imagenUrl || p.imagenPrincipal) && (
                            // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel (D-95)
                            <img src={p.imagenUrl || getCloudinaryUrl(p.imagenPrincipal || "", 300)} alt="" className="w-full h-full object-cover" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <b className="block truncate max-w-[260px]">{p.nombre}</b>
                          {(p.variantes?.length ?? 0) > 0 && <span className="block text-xs text-[var(--accent)] font-semibold">{p.variantes?.length} variantes</span>}
                          {p.slug && <small className="text-[var(--muted)]">/producto/{p.slug}</small>}
                          {esNovedad(p) && <div className="mt-0.5"><Chip tono="acento">Nuevo</Chip></div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-[var(--muted)]">{Array.isArray(p.categorias) ? p.categorias.join(", ") : ""}</td>
                    <td className="p-2 font-semibold whitespace-nowrap">S/ {p.precio.toFixed(2)}</td>
                    <td className="p-2">
                      {p.stock && (
                        <Chip tono={p.stock === "Disponible" ? "ok" : p.stock === "Limitado" ? "aviso" : "malo"}>{p.stock}</Chip>
                      )}
                    </td>
                    <td className="p-2">
                      <Switch activo={p.activo !== false} etiqueta={`Activo: ${p.nombre}`} onChange={() => alternarActivo(p)} />
                    </td>
                    <td className="p-2 text-right">
                      <Link href={`/admin/productos/${p._id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--surface)] transition">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtrados.length > 0 && (
          <div className="flex items-center justify-between gap-3 pt-3 px-2 text-sm text-[var(--muted)]">
            <span>{(paginaActual - 1) * ITEMS_PER_PAGE + 1}–{Math.min(paginaActual * ITEMS_PER_PAGE, filtrados.length)} de {filtrados.length}</span>
            {totalPages > 1 && (
              <span className="flex items-center gap-2">
                <button onClick={() => setPagina(Math.max(paginaActual - 1, 1))} disabled={paginaActual === 1} className="rounded-lg border border-[var(--line)] px-3 py-1 font-semibold disabled:opacity-50">← Anterior</button>
                <span>Página {paginaActual} de {totalPages}</span>
                <button onClick={() => setPagina(Math.min(paginaActual + 1, totalPages))} disabled={paginaActual === totalPages} className="rounded-lg border border-[var(--line)] px-3 py-1 font-semibold disabled:opacity-50">Siguiente →</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
