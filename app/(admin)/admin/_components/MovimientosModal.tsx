"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Paginated, StockMovement, StockMovimientoTipo } from "@/types";
import { Chip, type Tono } from "@/app/(admin)/admin/_components/ui";

const ETIQUETA: Record<StockMovimientoTipo, { texto: string; tono: Tono }> = {
  entrada: { texto: "Entrada", tono: "ok" },
  salida: { texto: "Salida", tono: "malo" },
  ajuste: { texto: "Ajuste", tono: "acento" },
  pedido: { texto: "Pedido", tono: "aviso" },
  devolucion: { texto: "Devolución", tono: "ok" },
};

export default function MovimientosModal({ producto, onCerrar }: { producto: { _id: string; nombre: string }; onCerrar: () => void }) {
  const [datos, setDatos] = useState<Paginated<StockMovement> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch(`/api/admin/inventory/movements?productId=${encodeURIComponent(producto._id)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (activo) setError(err.error || "No se pudieron cargar los movimientos");
          return;
        }
        const d: Paginated<StockMovement> = await res.json();
        if (activo) setDatos(d);
      } catch {
        if (activo) setError("Error de conexión al cargar los movimientos");
      }
    };
    cargar();
    return () => { activo = false; };
  }, [producto._id]);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Movimientos de ${producto.nombre}`}
        className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
          <div>
            <h2 className="font-bold">Movimientos de stock</h2>
            <p className="text-sm text-[var(--muted)]">{producto.nombre}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] hover:bg-[var(--bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto p-4">
          {error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : !datos ? (
            <p className="text-sm text-[var(--muted)]">Cargando…</p>
          ) : datos.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Este producto todavía no tiene movimientos registrados.</p>
          ) : (
            <>
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[12.5px] text-[var(--muted)]">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2 text-right">Cantidad</th>
                    <th className="p-2 text-right">Antes → después</th>
                    <th className="p-2">Motivo</th>
                    <th className="p-2">Quién</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.items.map((m) => (
                    <tr key={m._id} className="border-b border-[var(--line)] last:border-0">
                      <td className="p-2 whitespace-nowrap">{new Date(m.createdAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="p-2"><Chip tono={ETIQUETA[m.tipo].tono}>{ETIQUETA[m.tipo].texto}</Chip></td>
                      <td className={`p-2 text-right font-bold ${m.cantidad > 0 ? "text-green-600" : "text-red-600"}`}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                      <td className="p-2 text-right whitespace-nowrap">{m.stockAntes} → {m.stockDespues}</td>
                      <td className="p-2 text-[var(--muted)]">{m.motivo || "—"}</td>
                      <td className="p-2 text-[var(--muted)]">{m.adminNombre || (m.adminId ? "Administrador" : "Sistema")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {datos.total > datos.items.length && (
                <p className="mt-3 text-xs text-[var(--muted)]">Mostrando los {datos.items.length} más recientes de {datos.total}.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
