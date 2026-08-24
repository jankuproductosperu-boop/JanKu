"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Save,
  CheckCircle,
  AlertCircle,
  ListOrdered,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { invalidateCachePattern } from "@/lib/cache";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type Product = {
  _id: string;
  nombre: string;
  imagenUrl?: string;
  categoriaSlugs?: string[];
  mostrarEnHome?: boolean;
  ordenHome?: number;
  ordenPorCategoria?: Record<string, number>;
};

type Category = {
  _id: string;
  nombre: string;
  slug: string;
  activo?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// LISTA ORDENABLE
//
// Se reemplazó el "arrastrar con el mouse" por controles explícitos, porque
// el drag-and-drop nativo del navegador es poco confiable (a veces no
// detecta bien dónde sueltas). En su lugar:
//   - ⬆️/⬇️  mueven un producto una posición — para ajustes finos.
//   - "Inicio"/"Final"  lo mandan directo al primer o último lugar — para el
//     caso típico de "quiero este producto nuevo primero" sin hacer 100 clics.
//   - El campo numérico  permite saltar a una posición exacta escribiéndola.
// ─────────────────────────────────────────────────────────────────────────────

function ListaOrdenable({
  contexto,
  contextoLabel,
  productosIniciales,
  onGuardado,
}: {
  contexto: string;
  contextoLabel: string;
  productosIniciales: Product[];
  onGuardado: (contexto: string, orden: { id: string; orden: number }[]) => void;
}) {
  const [lista, setLista] = useState<Product[]>(productosIniciales);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  // Valor que el usuario está escribiendo en el campo de posición de cada
  // fila, mientras lo edita (separado de la posición real hasta confirmar).
  const [posicionEditando, setPosicionEditando] = useState<Record<string, string>>({});

  const moverAIndice = (indiceActual: number, indiceDestino: number) => {
    setLista((prev) => {
      const destino = Math.max(0, Math.min(prev.length - 1, indiceDestino));
      if (destino === indiceActual) return prev;
      const actualizado = [...prev];
      const [movido] = actualizado.splice(indiceActual, 1);
      actualizado.splice(destino, 0, movido);
      return actualizado;
    });
    setMensaje(null);
  };

  const moverArriba = (index: number) => moverAIndice(index, index - 1);
  const moverAbajo = (index: number) => moverAIndice(index, index + 1);
  const moverAlInicio = (index: number) => moverAIndice(index, 0);
  const moverAlFinal = (index: number) => moverAIndice(index, lista.length - 1);

  const confirmarPosicion = (id: string, index: number) => {
    const valor = posicionEditando[id];
    if (valor === undefined || valor.trim() === "") return;
    const nuevaPosicion = parseInt(valor, 10);
    if (Number.isNaN(nuevaPosicion)) {
      setPosicionEditando((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    // El usuario escribe posiciones "humanas" (1, 2, 3...) — se convierte a
    // índice interno (0, 1, 2...) y se limita dentro del rango válido.
    moverAIndice(index, nuevaPosicion - 1);
    setPosicionEditando((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const guardarOrden = async () => {
    setGuardando(true);
    setMensaje(null);

    const orden = lista.map((p, index) => ({ id: p._id, orden: index }));

    try {
      const res = await fetch("/api/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contexto, orden }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMensaje({ tipo: "error", texto: err.error || "No se pudo guardar el orden." });
        return;
      }

      invalidateCachePattern("products");
      setMensaje({ tipo: "exito", texto: "¡Orden guardado! Ya se refleja en el sitio." });
      onGuardado(contexto, orden);
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al guardar." });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {mensaje && (
        <div className={`rounded-lg p-4 mb-4 flex items-center gap-2 text-sm font-medium ${
          mensaje.tipo === "exito" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {mensaje.tipo === "exito" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">
            {contextoLabel} <span className="text-gray-400 font-normal">({lista.length} productos)</span>
          </h2>
          <button
            onClick={guardarOrden}
            disabled={guardando || lista.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando..." : "Guardar orden"}
          </button>
        </div>

        {lista.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No hay productos aquí todavía</p>
            <p className="text-sm mt-2">
              {contexto === "home"
                ? 'Activa "Mostrar en página de inicio" en algún producto desde el panel de Productos.'
                : "Asigna esta categoría a algún producto desde el panel de Productos."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {lista.map((p, index) => (
              <div
                key={p._id}
                className="flex items-center gap-2 md:gap-3 p-3 rounded-xl border-2 border-gray-200 bg-gradient-to-r from-white to-gray-50"
              >
                {/* Posición actual + campo para saltar directo */}
                <input
                  type="number"
                  min={1}
                  max={lista.length}
                  value={posicionEditando[p._id] ?? String(index + 1)}
                  onChange={(e) => setPosicionEditando((prev) => ({ ...prev, [p._id]: e.target.value }))}
                  onBlur={() => confirmarPosicion(p._id, index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-12 flex-shrink-0 text-center text-xs font-bold border border-gray-300 rounded-lg py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  title="Escribe una posición y presiona Enter para saltar ahí"
                />

                <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  {p.imagenUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate min-w-0">{p.nombre}</span>

                {/* Saltos grandes: al inicio / al final */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => moverAlInicio(index)}
                    disabled={index === 0}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover al inicio de todo"
                  >
                    <ChevronsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moverAlFinal(index)}
                    disabled={index === lista.length - 1}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover al final de todo"
                  >
                    <ChevronsDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Ajuste fino: un paso arriba/abajo */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moverArriba(index)}
                    disabled={index === 0}
                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover una posición arriba"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moverAbajo(index)}
                    disabled={index === lista.length - 1}
                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover una posición abajo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {lista.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
            <p className="text-xs text-gray-500 text-center">
              💡 Escribe un número en el casillero para saltar directo a esa posición, o usa
              <strong> ⏫/⏬ para inicio/final</strong> y <strong>⬆️/⬇️ para un paso</strong>.
            </p>
            <p className="text-xs text-gray-500 text-center">
              No olvides hacer clic en <strong>&quot;Guardar orden&quot;</strong> arriba cuando termines de acomodar.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────────────

export default function OrdenProductosPage() {
  const { isAuthenticated, isChecking } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [contexto, setContexto] = useState("home"); // "home" o slug de categoría

  useEffect(() => {
    const cargar = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
        setCategories(Array.isArray(catData) ? catData.filter((c: Category) => c.activo !== false) : []);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) cargar();
  }, [isAuthenticated]);

  const productosDelContexto = useMemo(() => {
    if (contexto === "home") {
      return products
        .filter((p) => p.mostrarEnHome === true)
        .sort((a, b) => (a.ordenHome ?? Infinity) - (b.ordenHome ?? Infinity) || a.nombre.localeCompare(b.nombre));
    }
    return products
      .filter((p) => p.categoriaSlugs?.includes(contexto))
      .sort((a, b) => {
        const oa = a.ordenPorCategoria?.[contexto] ?? Infinity;
        const ob = b.ordenPorCategoria?.[contexto] ?? Infinity;
        return oa - ob || a.nombre.localeCompare(b.nombre);
      });
  }, [contexto, products]);

  const contextoLabel = useMemo(() => {
    if (contexto === "home") return "Página de Inicio (Home)";
    return categories.find((c) => c.slug === contexto)?.nombre || contexto;
  }, [contexto, categories]);

  const handleGuardado = (ctx: string, orden: { id: string; orden: number }[]) => {
    setProducts((prev) =>
      prev.map((p) => {
        const item = orden.find((o) => o.id === p._id);
        if (!item) return p;
        if (ctx === "home") {
          return { ...p, ordenHome: item.orden };
        }
        return { ...p, ordenPorCategoria: { ...(p.ordenPorCategoria || {}), [ctx]: item.orden } };
      })
    );
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-xl text-white">
              <ListOrdered className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Orden de Productos</h1>
              <p className="text-gray-600 text-sm">Elige qué producto se muestra primero</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
        </div>

        {/* Selector de contexto */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ¿Dónde quieres ordenar los productos?
          </label>
          <select
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm font-medium"
          >
            <option value="home">🏠 Página de Inicio (Home)</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>📁 {c.nombre}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            El orden que definas aquí es <strong>independiente</strong>: cambiar el orden en Home no afecta el
            orden de este mismo producto dentro de sus categorías, y viceversa.
          </p>
        </div>

        <ListaOrdenable
          key={contexto}
          contexto={contexto}
          contextoLabel={contextoLabel}
          productosIniciales={productosDelContexto}
          onGuardado={handleGuardado}
        />
      </div>
    </div>
  );
}