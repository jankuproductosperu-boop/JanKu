"use client";

import { useState, type KeyboardEvent } from "react";
import { Ticket, X } from "lucide-react";
import { normalizarTelefono } from "@/lib/phone";
import type { CouponValidateResult } from "@/types";

type CuponValido = Extract<CouponValidateResult, { valido: true }>;

type Props = {
  /** Líneas del carrito; `varianteId` igual que en POST /api/orders (el precio sale de la variante). */
  items: { id: string; varianteId?: string; cantidad: number }[];
  telefono: string; // tal como está en el formulario
  /** `aplicado` = lo que respondió el servidor; "nivel" pinta la pastilla en ámbar. */
  aplicado: { codigo: string; mensaje: string; aplicado?: CuponValido["aplicado"] } | null;
  onAplicar: (r: CuponValido) => void;
  onQuitar: () => void;
};

const esResultado = (d: unknown): d is CouponValidateResult =>
  !!d && typeof d === "object" && "valido" in d && "mensaje" in d && typeof d.mensaje === "string";

// N1-5: el campo solo envía el código; el descuento y los totales los calcula el servidor.
// N1-4: se muestra tal cual el mensaje genérico del servidor (no revela si un código existe).
export function CouponField({ items, telefono, aplicado, onAplicar, onQuitar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState("");

  async function aplicar() {
    const limpio = codigo.trim();
    if (!limpio || validando) return;
    setValidando(true);
    setError("");
    try {
      const tel = normalizarTelefono(telefono) ? telefono.trim() : undefined;
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: limpio, items, ...(tel ? { telefono: tel } : {}) }),
      });
      const datos: unknown = await res.json().catch(() => null);
      if (res.status === 429) {
        setError("Demasiados intentos. Espera unos minutos.");
      } else if (res.ok && esResultado(datos)) {
        if (datos.valido) {
          onAplicar(datos);
          setCodigo("");
        } else {
          setError(datos.mensaje);
        }
      } else if (res.status === 400 || res.status === 409) {
        // El carrito no es válido (producto inactivo, sin stock, demasiadas unidades…).
        setError("No pudimos validar el cupón con tu carrito actual. Revisa tu carrito e inténtalo de nuevo.");
      } else {
        setError("No pudimos validar el cupón. Inténtalo de nuevo.");
      }
    } catch {
      setError("No pudimos validar el cupón. Inténtalo de nuevo.");
    } finally {
      setValidando(false);
    }
  }

  // Dentro del formulario del checkout: Enter aplica el cupón en vez de confirmar el pedido.
  function alPulsar(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void aplicar();
    }
  }

  if (aplicado) {
    const ambar = aplicado.aplicado === "nivel";
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
          ambar ? "border-amber-300 bg-amber-50 text-amber-900" : "border-green-300 bg-green-50 text-green-900"
        }`}
      >
        <Ticket className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold font-mono break-all">{aplicado.codigo}</p>
          <p>{aplicado.mensaje}</p>
        </div>
        <button
          type="button"
          onClick={onQuitar}
          className="inline-flex items-center gap-1 font-semibold underline flex-shrink-0"
        >
          <X className="w-4 h-4" />
          Quitar
        </button>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#2C2C6C] underline"
      >
        <Ticket className="w-4 h-4" />
        ¿Tienes un cupón?
      </button>
    );
  }

  return (
    <div>
      <label htmlFor="cupon" className="block text-sm font-semibold text-gray-700 mb-1">
        Cupón
      </label>
      <div className="flex gap-2">
        <input
          id="cupon"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={30}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={alPulsar}
          aria-invalid={!!error}
          aria-describedby={error ? "cupon-error" : undefined}
          className={`flex-1 min-w-0 border-2 rounded-lg px-3 py-2.5 text-base uppercase outline-none transition focus:border-[#2C2C6C] ${
            error ? "border-red-400" : "border-gray-300"
          }`}
        />
        <button
          type="button"
          onClick={aplicar}
          disabled={validando || !codigo.trim()}
          className="flex-shrink-0 bg-[#2C2C6C] text-white px-4 rounded-lg font-bold hover:bg-[#241B57] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {validando ? "Validando…" : "Aplicar"}
        </button>
      </div>
      {error && (
        <p id="cupon-error" role="alert" className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
