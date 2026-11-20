"use client";

import Link from "next/link";
import { useConsentimientoCookies } from "@/hooks/useConsentimientoCookies";

// Aviso de cookies (D-75). "Aceptar" y "Rechazar" tienen el mismo tamaño y peso.
export default function CookieBanner() {
  const { estado, aceptar, rechazar } = useConsentimientoCookies();
  if (estado !== "pendiente") return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-700">
          Usamos cookies de Google Analytics para saber cómo se usa la tienda, solo si las aceptas. Las necesarias para tu
          cuenta, el carrito y los favoritos no se pueden desactivar.{" "}
          <Link href="/cookies" className="font-semibold text-[#2C2C6C] underline">
            Más información
          </Link>
        </p>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={rechazar}
            className="flex-1 rounded-lg border-2 border-[#2C2C6C] px-5 py-2 text-sm font-semibold text-[#2C2C6C] md:flex-none"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={aceptar}
            className="flex-1 rounded-lg border-2 border-[#2C2C6C] bg-[#2C2C6C] px-5 py-2 text-sm font-semibold text-white md:flex-none"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
