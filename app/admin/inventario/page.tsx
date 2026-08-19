"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  ArrowUpDown,
  ArrowLeft,
  Download,
  AlertTriangle,
  Save,
  X,
  Pencil,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { invalidateCachePattern } from "@/lib/cache";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type Product = {
  _id: string;
  nombre: string;
  codigo?: string;
  categorias?: string[];
  categoriaSlugs?: string[];
  stock: "Disponible" | "Limitado" | "Agotado";
  stockCantidad: number;
  stockMinimo: number;
  precio: number;
  precioCosto?: number;
  proveedor?: string;
  activo?: boolean;
};

type Category = {
  _id: string;
  nombre: string;
  slug: string;
};

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
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function calcularMargen(precio: number, costo?: number): { monto: number; porcentaje: number | null } {
  const c = costo || 0;
  const monto = precio - c;
  const porcentaje = c > 0 ? (monto / c) * 100 : null;
  return { monto, porcentaje };
}

function exportarCSV(products: Product[], categories: Category[]) {
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

  const [products, setProducts] = useState<Product[]>([]);
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

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products"),
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

  const empezarEdicion = (p: Product) => {
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

    const body = {
      codigo: editForm.codigo.trim() || undefined,
      stockCantidad: Math.max(0, parseInt(editForm.stockCantidad) || 0),
      stockMinimo: Math.max(0, parseInt(editForm.stockMinimo) || 0),
      precioCosto: Math.max(0, parseFloat(editForm.precioCosto) || 0),
      proveedor: editForm.proveedor.trim(),
      activo: editForm.activo,
    };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando inventario...</p>
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
      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-indigo-600 transition"
    >
      {label}
      <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey === sortk ? "text-indigo-600" : "text-gray-300"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-xl text-white">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventario</h1>
              <p className="text-gray-600 text-sm">Stock, costos y márgenes de todos tus productos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al panel
            </Link>
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
        <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>{c.nombre}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm cursor-pointer bg-white hover:bg-gray-50">
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
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
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
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-gray-400">
                      No hay productos que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((p) => {
                    const editando = editandoId === p._id;
                    const { monto: margenMonto, porcentaje: margenPct } = calcularMargen(p.precio, p.precioCosto);
                    const bajoStock = (p.stockCantidad ?? 0) <= (p.stockMinimo ?? 5);

                    return (
                      <Fragment key={p._id}>
                      <tr
                        className={`transition ${savedFlashId === p._id ? "bg-green-50" : bajoStock ? "bg-red-50/40" : "hover:bg-gray-50"}`}
                      >
                        {/* Código */}
                        <td className="px-4 py-3">
                          {editando ? (
                            <input
                              value={editForm?.codigo || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, codigo: e.target.value })}
                              placeholder="SKU-001"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-xs uppercase"
                            />
                          ) : (
                            <span className="font-mono text-xs text-gray-500">{p.codigo || "—"}</span>
                          )}
                        </td>

                        {/* Nombre */}
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate" title={p.nombre}>
                          {p.nombre}
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">
                          {catNombrePorSlug(p.categoriaSlugs) || "—"}
                        </td>

                        {/* Stock cantidad */}
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="number"
                              min={0}
                              value={editForm?.stockCantidad || ""}
                              onChange={(e) => setEditForm((f) => f && { ...f, stockCantidad: e.target.value })}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-xs"
                            />
                          ) : (
                            <span className={`font-bold ${bajoStock ? "text-red-600" : "text-gray-800"}`}>
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
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-xs"
                            />
                          ) : (
                            <span className="text-gray-500 text-xs">{p.stockMinimo ?? 5}</span>
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
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                            />
                          ) : (
                            <span className="text-gray-500">S/ {(p.precioCosto || 0).toFixed(2)}</span>
                          )}
                        </td>

                        {/* Venta */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          S/ {p.precio.toFixed(2)}
                        </td>

                        {/* Margen */}
                        <td className="px-4 py-3 text-right">
                          <span className={margenMonto >= 0 ? "text-green-600" : "text-red-600"}>
                            S/ {margenMonto.toFixed(2)}
                          </span>
                          {margenPct !== null && (
                            <span className="block text-[10px] text-gray-400">
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
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          ) : (
                            <span className="text-gray-500 text-xs">{p.proveedor || "—"}</span>
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
                            <span className="text-gray-400 text-xs">Inactivo</span>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
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
                                  className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
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
                          </div>
                        </td>
                      </tr>
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
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Mostrando {productosFiltrados.length} de {products.length} productos
          </div>
        </div>
      </div>
    </div>
  );
}