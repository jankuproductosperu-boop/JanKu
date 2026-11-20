"use client";

import { useConsentimientoCookies } from "@/hooks/useConsentimientoCookies";

const TEXTO = { aceptadas: "aceptaste", rechazadas: "rechazaste", pendiente: "aún no elegiste" } as const;

// Botón "Preferencias de cookies": vuelve a mostrar el aviso para cambiar la elección.
export default function PreferenciasCookies({ className, mostrarEstado = false }: { className?: string; mostrarEstado?: boolean }) {
  const { estado, cambiarPreferencias } = useConsentimientoCookies();
  return (
    <>
      {mostrarEstado && estado && <span>Hoy {TEXTO[estado]} las cookies de medición. </span>}
      <button type="button" onClick={cambiarPreferencias} className={className}>
        Preferencias de cookies
      </button>
    </>
  );
}
