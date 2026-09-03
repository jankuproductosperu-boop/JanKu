"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Percent,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Tag,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type DiscountTier = {
  _id: string;
  nombre: string;
  montoMinimo: number;
  tipoDescuento: "porcentaje" | "monto_fijo";
  valorDescuento: number;
  activo: boolean;
};

type FormState = {
  nombre: string;
  montoMinimo: string;
  tipoDescuento: "porcentaje" | "monto_fijo";
  valorDescuento: string;
  activo: boolean;
};

const FORM_VACIO: FormState = {
  nombre: "",
  montoMinimo: "",
  tipoDescuento: "porcentaje",
  valorDescuento: "",
  activo: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────────────

export default function DescuentosPage() {
  const { isAuthenticated, isChecking } = useAuth();

  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const cargarTiers = async () => {
    try {
      const res = await fetch("/api/discounts");
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando descuentos:", err);
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) cargarTiers();
  }, [isAuthenticated]);

  const resetForm = () => {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setError("");
  };

  const abrirNuevo = () => {
    resetForm();
    setShowForm(true);
  };

  const abrirEditar = (tier: DiscountTier) => {
    setForm({
      nombre: tier.nombre,
      montoMinimo: String(tier.montoMinimo),
      tipoDescuento: tier.tipoDescuento,
      valorDescuento: String(tier.valorDescuento),
      activo: tier.activo,
    });
    setEditandoId(tier._id);
    setShowForm(true);
    setError("");
  };

  const cerrarForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim()) {
      setError("Ponle un nombre interno al descuento (solo para identificarlo tú, no lo ve el cliente)");
      return;
    }
    const montoMinimo = parseFloat(form.montoMinimo);
    const valorDescuento = parseFloat(form.valorDescuento);

    if (Number.isNaN(montoMinimo) || montoMinimo <= 0) {
      setError("El monto mínimo debe ser un número mayor a 0");
      return;
    }
    if (Number.isNaN(valorDescuento) || valorDescuento <= 0) {
      setError("El valor del descuento debe ser un número mayor a 0");
      return;
    }
    if (form.tipoDescuento === "porcentaje" && valorDescuento > 100) {
      setError("Un descuento por porcentaje no puede ser mayor a 100%");
      return;
    }
    if (form.tipoDescuento === "monto_fijo" && valorDescuento >= montoMinimo) {
      setError("El descuento en soles no puede ser mayor o igual al monto mínimo de compra");
      return;
    }

    setGuardando(true);

    const body = {
      nombre: form.nombre.trim(),
      montoMinimo,
      tipoDescuento: form.tipoDescuento,
      valorDescuento,
      activo: form.activo,
    };

    try {
      const res = editandoId
        ? await fetch(`/api/discounts/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/discounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "No se pudo guardar el descuento");
        return;
      }

      setMensajeExito(editandoId ? "Descuento actualizado" : "Descuento creado");
      setTimeout(() => setMensajeExito(""), 2500);
      cerrarForm();
      await cargarTiers();
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (tier: DiscountTier) => {
    try {
      const res = await fetch(`/api/discounts/${tier._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !tier.activo }),
      });
      if (res.ok) {
        setTiers((prev) =>
          prev.map((t) => (t._id === tier._id ? { ...t, activo: !t.activo } : t))
        );
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const eliminarTier = async (id: string) => {
    if (!confirm("¿Eliminar este nivel de descuento? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/discounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTiers((prev) => prev.filter((t) => t._id !== id));
      } else {
        alert("No se pudo eliminar el descuento");
      }
    } catch {
      alert("Error de conexión al eliminar");
    }
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando descuentos...</p>
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
            <div className="bg-pink-600 p-3 rounded-xl text-white">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Descuentos por Monto</h1>
              <p className="text-gray-600 text-sm">Se aplican solos al superar cierto total en el carrito</p>
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

        {mensajeExito && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {mensajeExito}
          </div>
        )}

        {/* Explicación de cómo funciona */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          <p className="font-semibold mb-1">¿Cómo funciona?</p>
          <p>
            Si un cliente tiene, por ejemplo, S/ 100 en el carrito y tienes activos un descuento de{" "}
            <strong>10% desde S/ 80</strong> y otro de <strong>20% desde S/ 100</strong>, se aplica automáticamente
            el de <strong>20%</strong> — siempre gana el nivel más alto que sí se cumple, nunca se suman entre sí.
          </p>
        </div>

        {/* Botón agregar */}
        {!showForm && (
          <button
            onClick={abrirNuevo}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800 shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Agregar Nuevo Descuento
          </button>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editandoId ? "Editar Descuento" : "Nuevo Descuento"}
              </h2>
              <button onClick={cerrarForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre interno <span className="text-gray-400 font-normal">(solo para identificarlo tú)</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Descuento fin de semana"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto mínimo de compra (S/)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.montoMinimo}
                  onChange={(e) => setForm({ ...form, montoMinimo: e.target.value })}
                  placeholder="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de descuento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipoDescuento: "porcentaje" })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium text-sm transition ${
                      form.tipoDescuento === "porcentaje"
                        ? "border-pink-600 bg-pink-50 text-pink-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    Porcentaje
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipoDescuento: "monto_fijo" })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium text-sm transition ${
                      form.tipoDescuento === "monto_fijo"
                        ? "border-pink-600 bg-pink-50 text-pink-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Monto fijo (S/)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor del descuento {form.tipoDescuento === "porcentaje" ? "(%)" : "(S/)"}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valorDescuento}
                  onChange={(e) => setForm({ ...form, valorDescuento: e.target.value })}
                  placeholder={form.tipoDescuento === "porcentaje" ? "10" : "15"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
              </div>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-2 focus:ring-pink-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Descuento activo</span>
              </label>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-pink-700 text-white py-3 rounded-lg font-semibold hover:from-pink-700 hover:to-pink-800 transition disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : editandoId ? "Guardar Cambios" : "Crear Descuento"}
                </button>
                <button
                  type="button"
                  onClick={cerrarForm}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de niveles */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Niveles configurados <span className="text-gray-400 font-normal">({tiers.length})</span>
          </h2>

          {tiers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Tag className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">No hay descuentos configurados</p>
              <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div
                  key={tier._id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                    tier.activo ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${tier.tipoDescuento === "porcentaje" ? "bg-pink-100 text-pink-600" : "bg-indigo-100 text-indigo-600"}`}>
                    {tier.tipoDescuento === "porcentaje" ? <Percent className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{tier.nombre}</p>
                    <p className="text-sm text-gray-500">
                      Desde <strong>S/ {tier.montoMinimo.toFixed(2)}</strong> → descuento de{" "}
                      <strong>
                        {tier.tipoDescuento === "porcentaje"
                          ? `${tier.valorDescuento}%`
                          : `S/ ${tier.valorDescuento.toFixed(2)}`}
                      </strong>
                    </p>
                  </div>

                  <button
                    onClick={() => toggleActivo(tier)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition ${
                      tier.activo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {tier.activo ? "Activo" : "Inactivo"}
                  </button>

                  <button
                    onClick={() => abrirEditar(tier)}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition flex-shrink-0"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => eliminarTier(tier._id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex-shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}