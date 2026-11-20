"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Package,
  Search,
  ArrowUpDown,
  Download,
  AlertTriangle,
  Save,
  X,
  Pencil,
  CheckCircle,
  History,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { invalidateCachePattern } from "@/lib/cache";
import type { ProductAdmin, Category, StockEstado } from "@/types";
import MovimientosModal from "@/app/(admin)/admin/_components/MovimientosModal";
import { etiquetaVariante } from "@/lib/variantes";

type ProductoInventario = ProductAdmin & { stock: StockEstado };

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = "nombre" | "stockCantidad" | "precio" | "margen" | "codigo";
type SortDir = "asc" | "desc";

type EditState = {
  codigo: string;
  stockCantidad: string;
  stockMinimo: string;
  precioCosto: string;
  proveedor: string;
  activo: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// FILAS POR VARIANTE (fase 13b): el stock de cada variante solo cambia con
// /api/admin/inventory/adjust (deja movimiento). Se envía el stock que se veía
// (`esperado`): si alguien lo cambió entretanto, el servidor responde 409.
// ─────────────────────────────────────────────────────────────────────────────

type ResultadoAjuste = { stockDespues: number; stock: StockEstado; stockTotal?: number };

function FilasVariantes({
  producto,
  onAjustado,
}: {
  producto: ProductoInventario;
  onAjustado: (varianteId: string, r: ResultadoAjuste) => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; texto: string } | null>(null);
  const orden = (producto.opciones ?? []).map((o) => o.nombre);

  const guardar = async (varianteId: string, antes: number) => {
    const texto = valores[varianteId];
    const cantidad = Math.max(0, parseInt(texto ?? "") || 0);
    if (texto === undefined || cantidad === antes) return;
    setGuardandoId(varianteId);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: producto._id,
          variantId: varianteId,
          modo: "fijar",
          cantidad,
          esperado: antes,
          motivo: "Ajuste desde Inventario",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ id: varianteId, texto: data.error || "No se pudo guardar el stock de la variante" });
        return;
      }
      onAjustado(varianteId, data as ResultadoAjuste);
      setValores((v) => {
        const resto = { ...v };
        delete resto[varianteId];
        return resto;
      });
    } catch {
      setError({ id: varianteId, texto: "Error de conexión al guardar" });
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <>
      {(producto.variantes ?? []).map((v) => {
        const antes = v.stockCantidad ?? 0;
        const valor = valores[v._id] ?? String(antes);
        const cambiado = valores[v._id] !== undefined && (parseInt(valor) || 0) !== antes;
        return (
          <tr key={v._id} className={`bg-[var(--bg)]/60 ${v.activo === false ? "opacity-55" : ""}`}>
            <td className="px-4 py-2 font-mono text-[11px] text-[var(--muted)]">{v.sku || ""}</td>
            <td className="px-4 py-2 text-xs text-[var(--ink)]" colSpan={2}>
              <span className="text-[var(--muted)] mr-1">↳</span>
              {etiquetaVariante(v.combinacion, orden)}
              {v.activo === false && <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--muted)]">inactiva</span>}
            </td>
            <td className="px-4 py-2 text-center">
              <div className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={valor}
                  onChange={(e) => setValores((x) => ({ ...x, [v._id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") guardar(v._id, antes); }}
                  aria-label={`Stock de ${etiquetaVariante(v.combinacion, orden)}`}
                  className="w-16 px-2 py-1 border border-[var(--line)] rounded text-center text-xs"
                />
                {cambiado && (
                  <button
                    onClick={() => guardar(v._id, antes)}
                    disabled={guardandoId === v._id}
                    className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                    title="Guardar stock"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                )}
              </div>
            </td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2" />
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-right text-xs text-[var(--muted)]">
              {typeof v.precio === "number" ? `S/ ${v.precio.toFixed(2)}` : ""}
            </td>
            <td className="px-4 py-2" colSpan={4}>
              {error?.id === v._id && <span className="text-xs text-red-700">{error.texto}</span>}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getStockBadge(stock: string) {
  switch (stock) {
    case "Disponible":
      return "bg-green-100 text-green-700 border-green-200";
    case "Limitado":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Agotado":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-[var(--line)] text-[var(--ink)] border-[var(--line)]";
  }
}

function calcularMargen(precio: number, costo?: number): { monto: number; porcentaje: number | null } {
  const c = costo || 0;
  const monto = precio - c;
  const porcentaje = c > 0 ? (monto / c) * 100 : null;
  return { monto, porcentaje };
}

function exportarCSV(products: ProductoInventario[], categories: Category[]) {
  const catNombre = (slugs?: string[]) =>
    (slugs || [])
      .map((s) => categories.find((c) => c.slug === s)?.nombre || s)
      .join(" | ");

  const headers = [
    "Código", "Nombre", "Categoría", "Stock actual", "Stock mínimo", "Estado",
    "Precio costo", "Precio venta", "Margen", "Margen %", "Proveedor", "Activo",
  ];

  const rows = products.map((p) => {
    const { monto, porcentaje } = calcularMargen(p.precio, p.precioCosto);
    return [
      p.codigo || "",
      p.nombre,
      catNombre(p.categoriaSlugs),
      p.stockCantidad ?? 0,
      p.stockMinimo ?? 0,
      p.stock,
      (p.precioCosto || 0).toFixed(2),
      p.precio.toFixed(2),
      monto.toFixed(2),
      porcentaje !== null ? `${porcentaje.toFixed(1)}%` : "",
      p.proveedor || "",
      p.activo === false ? "No" : "Sí",
    ];
  });

  // Excel en configuración regional español espera ";" como separador de
  // columnas, no ",". Con coma, todo aparece amontonado en una sola columna.
  const DELIM = ";";
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(DELIM))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventario-janku-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────────────

export default function InventarioPage() {
  const { isAuthenticated, isChecking } = useAuth();

  const [products, setProducts] = useState<ProductoInventario[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);
  const [movimientosDe, setMovimientosDe] = useState<{ _id: string; nombre: string } | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const alternarExpandido = (id: string) =>
    setExpandidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  const alAjustarVariante = (productoId: string, varianteId: string, r: ResultadoAjuste) =>
    setProducts((prev) =>
      prev.map((p) =>
        p._id !== productoId
          ? p
          : {
              ...p,
              stock: r.stock,
              stockCantidad: r.stockTotal ?? p.stockCantidad,
              variantes: (p.variantes ?? []).map((v) => (v._id === varianteId ? { ...v, stockCantidad: r.stockDespues } : v)),
            }
      )
    );

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/categories"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error("Error cargando inventario:", err);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  // ── Filtrado + orden (derivado, sin efecto extra) ────────────────────────
  const productosFiltrados = useMemo(() => {
    let result = [...products];

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo || "").toLowerCase().includes(q)
      );
    }

    if (categoriaFiltro) {
      result = result.filter((p) => p.categoriaSlugs?.includes(categoriaFiltro));
    }

    if (soloBajoStock) {
      result = result.filter((p) => (p.stockCantidad ?? 0) <= (p.stockMinimo ?? 5));
    }

    result.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      if (sortKey === "margen") {
        valA = calcularMargen(a.precio, a.precioCosto).monto;
        valB = calcularMargen(b.precio, b.precioCosto).monto;
      } else if (sortKey === "codigo") {
        valA = a.codigo || "";
        valB = b.codigo || "";
      } else {
        valA = a[sortKey] as string | number;
        valB = b[sortKey] as string | number;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [products, busqueda, categoriaFiltro, soloBajoStock, sortKey, sortDir]);

  const alertasBajoStock = useMemo(
    () => products.filter((p) => (p.stockCantidad ?? 0) <= (p.stockMinimo ?? 5) && p.activo !== false),
    [products]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const empezarEdicion = (p: ProductoInventario) => {
    setEditandoId(p._id);
    setErrorGuardar("");
    setEditForm({
      codigo: p.codigo || "",
      stockCantidad: String(p.stockCantidad ?? 0),
      stockMinimo: String(p.stockMinimo ?? 5),
      precioCosto: String(p.precioCosto ?? 0),
      proveedor: p.proveedor || "",
      activo: p.activo !== false,
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditForm(null);
    setErrorGuardar("");
  };

  const guardarEdicion = async (id: string) => {
    if (!editForm) return;
    setGuardando(true);
    setErrorGuardar("");

    // Solo viaja lo que cambió. Así no se pisa un ajuste de stock hecho mientras tanto
    // (va con stockEsperado y el servidor responde 409) ni se escriben costos sin tocarlos.
    const original = products.find((p) => p._id === id);
    const nuevo = {
      codigo: editForm.codigo.trim(),
      stockCantidad: Math.max(0, parseInt(editForm.stockCantidad) || 0),
      stockMinimo: Math.max(0, parseInt(editForm.stockMinimo) || 0),
      precioCosto: Math.max(0, parseFloat(editForm.precioCosto) || 0),
      proveedor: editForm.proveedor.trim(),
      activo: editForm.activo,
    };
    const body: Record<string, unknown> = {};
    if (!original || nuevo.codigo !== (original.codigo || "")) body.codigo = nuevo.codigo; // "" = quitar el código
    if (!original || nuevo.stockCantidad !== (original.stockCantidad ?? 0)) {
      body.stockCantidad = nuevo.stockCantidad;
      if (original) body.stockEsperado = original.stockCantidad ?? 0;
    }
    if (!original || nuevo.stockMinimo !== (original.stockMinimo ?? 5)) body.stockMinimo = nuevo.stockMinimo;
    if (!original || nuevo.precioCosto !== (original.precioCosto ?? 0)) body.precioCosto = nuevo.precioCosto;
    if (!original || nuevo.proveedor !== (original.proveedor || "")) body.proveedor = nuevo.proveedor;
    if (!original || nuevo.activo !== (original.activo !== false)) body.activo = nuevo.activo;

    if (Object.keys(body).length === 0) {
      cancelarEdicion();
      setGuardando(false);
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorGuardar(err.error || "No se pudo guardar. Verifica que el código no esté repetido.");
        setGuardando(false);
        return;
      }

      const actualizado = await res.json();
      setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, ...actualizado } : p)));
      invalidateCachePattern("products");
      setEditandoId(null);
      setEditForm(null);
      setSavedFlashId(id);
      setTimeout(() => setSavedFlashId(null), 1500);
    } catch {
      setErrorGuardar("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-[var(--muted)] font-medium">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const catNombrePorSlug = (slugs?: string[]) =>
    (slugs || []).map((s) => categories.find((c) => c.slug === s)?.nombre || s).join(", ");

  const SortHeader = ({ label, sortk }: { label: string; sortk: SortKey }) => (
    <button
      onClick={() => toggleSort(sortk)}
      className="flex items-center gap-1 font-semibold text-[var(--ink)] hover:text-indigo-600 transition"
    >
      {label}
      <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey === sortk ? "text-indigo-600" : "text-[var(--muted)]"}`} />
    </button>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-xl text-white">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--ink)]">Inventario</h1>
              <p className="text-[var(--muted)] text-sm">Stock, costos y márgenes de todos tus productos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportarCSV(productosFiltrados, categories)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Alerta de bajo stock */}
        {alertasBajoStock.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-800 mb-1">
                  {alertasBajoStock.length} producto{alertasBajoStock.length !== 1 ? "s" : ""} con stock bajo o agotado
                </h4>
                <p className="text-sm text-yellow-700">
                  Revisa la columna Stock — están en su mínimo o por debajo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-3 py-2.5 border border-[var(--line)] rounded-lg text-sm bg-[var(--surface)] focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>{c.nombre}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2.5 border border-[var(--line)] rounded-lg text-sm cursor-pointer bg-[var(--surface)] hover:bg-[var(--bg)]">
            <input
              type="checkbox"
              checked={soloBajoStock}
              onChange={(e) => setSoloBajoStock(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            Solo bajo stock
          </label>
        </div>

        {/* Tabla */}
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg overflow-hidden">
          {/* Fase 23a: la tabla se desplaza dentro de su caja; cabecera y acciones quedan fijas. */}
          <div className="overflow-auto max-h-[calc(100vh-290px)] min-h-[320px]">
            <table className="tabla-fija w-full text-sm">
              <thead className="bg-[var(--bg)] border-b border-[var(--line)]">
                <tr>
                  <th className="px-4 py-3 text-left"><SortHeader label="Código" sortk="codigo" /></th>
                  <th className="px-4 py-3 text-left"><SortHeader label="Producto" sortk="nombre" /></th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-center"><SortHeader label="Stock" sortk="stockCantidad" /></th>
                  <th className="px-4 py-3 text-center">Mínimo</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-right"><SortHeader label="Venta" sortk="precio" /></th>
                  <th className="px-4 py-3 text-right"><SortHeader label="Margen" sortk="margen" /></th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-center">Activo</th>
                  <th className="col-acciones px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-[var(--muted)]">
                      No hay productos que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((p) => {
                    const editando = editandoId === p._id;
                    const { monto: margenMonto, porcentaje: margenPct } = calcularMargen(p.precio, p.precioCosto);
                    const bajoStock = (p.stockCantidad ?? 0) <= (p.stockMinimo ?? 5);
                    const conVariantes = (p.variantes?.length ?? 0) > 0;
                    const expandido = expandidos.has(p._id);

                    return (
                      <Fragment key={p._id}>
                      <tr
                        className={`transition ${savedFlashId === p._id ? "bg-green-50" : bajoStock ? "bg-red-50/40" : "hover:bg-[var(--bg)]"}`}
                      >
                        {/* Código */}
                        <td className="px-4 py-3">
                          {editando ? (
                            <input
                              value={editForm?.codigo || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, codigo: e.target.value })}
                              placeholder="SKU-001"
                              className="w-24 px-2 py-1 border border-[var(--line)] rounded text-xs uppercase"
                            />
                          ) : (
                            <span className="font-mono text-xs text-[var(--muted)]">{p.codigo || "—"}</span>
                          )}
                        </td>

                        {/* Nombre */}
                        <td className="px-4 py-3 font-medium text-[var(--ink)] max-w-[220px] truncate" title={p.nombre}>
                          {conVariantes ? (
                            <button onClick={() => alternarExpandido(p._id)} className="inline-flex items-center gap-1 max-w-full text-left hover:text-[var(--accent)]" aria-expanded={expandido}>
                              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${expandido ? "" : "-rotate-90"}`} />
                              <span className="truncate">{p.nombre}</span>
                              <span className="shrink-0 text-[10px] font-semibold text-[var(--accent)]">{p.variantes?.length} var.</span>
                            </button>
                          ) : (
                            p.nombre
                          )}
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3 text-[var(--muted)] text-xs max-w-[140px] truncate">
                          {catNombrePorSlug(p.categoriaSlugs) || "—"}
                        </td>

                        {/* Stock cantidad */}
                        <td className="px-4 py-3 text-center">
                          {editando && !conVariantes ? (
                            <input
                              type="number"
                              min={0}
                              value={editForm?.stockCantidad || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, stockCantidad: e.target.value })}
                              className="w-16 px-2 py-1 border border-[var(--line)] rounded text-center text-xs"
                            />
                          ) : (
                            <span className={`font-bold ${bajoStock ? "text-red-600" : "text-[var(--ink)]"}`}>
                              {p.stockCantidad ?? 0}
                            </span>
                          )}
                        </td>

                        {/* Stock mínimo */}
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="number"
                              min={0}
                              value={editForm?.stockMinimo || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, stockMinimo: e.target.value })}
                              className="w-16 px-2 py-1 border border-[var(--line)] rounded text-center text-xs"
                            />
                          ) : (
                            <span className="text-[var(--muted)] text-xs">{p.stockMinimo ?? 5}</span>
                          )}
                        </td>

                        {/* Estado (auto-calculado) */}
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStockBadge(p.stock)}`}>
                            {p.stock}
                          </span>
                        </td>

                        {/* Costo */}
                        <td className="px-4 py-3 text-right">
                          {editando ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editForm?.precioCosto || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, precioCosto: e.target.value })}
                              className="w-20 px-2 py-1 border border-[var(--line)] rounded text-right text-xs"
                            />
                          ) : (
                            <span className="text-[var(--muted)]">S/ {(p.precioCosto || 0).toFixed(2)}</span>
                          )}
                        </td>

                        {/* Venta */}
                        <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">
                          S/ {p.precio.toFixed(2)}
                        </td>

                        {/* Margen */}
                        <td className="px-4 py-3 text-right">
                          <span className={margenMonto >= 0 ? "text-green-600" : "text-red-600"}>
                            S/ {margenMonto.toFixed(2)}
                          </span>
                          {margenPct !== null && (
                            <span className="block text-[10px] text-[var(--muted)]">
                              {margenPct.toFixed(0)}%
                            </span>
                          )}
                        </td>

                        {/* Proveedor */}
                        <td className="px-4 py-3">
                          {editando ? (
                            <input
                              value={editForm?.proveedor || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, proveedor: e.target.value })}
                              placeholder="Opcional"
                              className="w-28 px-2 py-1 border border-[var(--line)] rounded text-xs"
                            />
                          ) : (
                            <span className="text-[var(--muted)] text-xs">{p.proveedor || "—"}</span>
                          )}
                        </td>

                        {/* Activo */}
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="checkbox"
                              checked={editForm?.activo ?? true}
                              onChange={(e) => setEditForm((f) => f && { ...f, activo: e.target.checked })}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                          ) : p.activo === false ? (
                            <span className="text-[var(--muted)] text-xs">Inactivo</span>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="col-acciones px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {editando ? (
                              <>
                                <button
                                  onClick={() => guardarEdicion(p._id)}
                                  disabled={guardando}
                                  className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                                  title="Guardar"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={cancelarEdicion}
                                  disabled={guardando}
                                  className="p-1.5 bg-[var(--line)] text-[var(--ink)] rounded hover:bg-[var(--line)] transition"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => empezarEdicion(p)}
                                className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!editando && (
                              <button
                                onClick={() => setMovimientosDe({ _id: p._id, nombre: p.nombre })}
                                className="p-1.5 bg-[var(--line)] text-[var(--ink)] rounded hover:opacity-80 transition"
                                title="Movimientos"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {conVariantes && expandido && (
                        <FilasVariantes producto={p} onAjustado={(vid, r) => alAjustarVariante(p._id, vid, r)} />
                      )}
                      {/* Error de guardado — pegado a la fila que estás editando, para verlo sin bajar la vista */}
                      {editando && errorGuardar && (
                        <tr>
                          <td colSpan={12} className="px-4 py-2 bg-red-50 border-t border-red-200">
                            <div className="flex items-center gap-2 text-red-700 text-xs">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              {errorGuardar}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>


          {/* Footer con conteo */}
          <div className="px-4 py-3 bg-[var(--bg)] border-t border-[var(--line)] text-xs text-[var(--muted)]">
            Mostrando {productosFiltrados.length} de {products.length} productos
          </div>
        </div>
      </div>
      {movimientosDe && <MovimientosModal producto={movimientosDe} onCerrar={() => setMovimientosDe(null)} />}
    </div>
  );
}