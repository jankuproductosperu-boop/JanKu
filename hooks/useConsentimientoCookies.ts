"use client";
import { useSyncExternalStore } from "react";
import { CLAVE_COOKIES, leerEstadoCookies, type EstadoCookies } from "@/lib/consentimiento";

// Elección de cookies del visitante (D-75), guardada en localStorage.
// En el servidor y durante la hidratación el estado es `null` (aún no se sabe): no se pinta
// ni el aviso ni Google Analytics, así quien ya eligió no ve el aviso aparecer y desaparecer.

const oyentes = new Set<() => void>();
let actual: EstadoCookies | null = null;

function leer(): EstadoCookies {
  if (actual) return actual;
  try {
    const texto = localStorage.getItem(CLAVE_COOKIES);
    actual = texto ? leerEstadoCookies(texto) : "pendiente";
  } catch {
    actual = "pendiente";
  }
  return actual;
}

function guardar(estado: EstadoCookies) {
  actual = estado;
  try {
    if (estado === "pendiente") localStorage.removeItem(CLAVE_COOKIES);
    else localStorage.setItem(CLAVE_COOKIES, JSON.stringify(estado));
  } catch {
    // sin almacenamiento: la elección vale solo para esta visita
  }
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Desactiva Google Analytics en esta visita y borra sus cookies (_ga, _ga_*). */
function apagarAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (id) (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = true;
  const host = window.location.hostname;
  const dominios = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const par of document.cookie.split(";")) {
    const nombre = par.split("=")[0].trim();
    if (nombre !== "_ga" && !nombre.startsWith("_ga_")) continue;
    for (const d of dominios) {
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

export function useConsentimientoCookies(): {
  estado: EstadoCookies | null;
  aceptar: () => void;
  rechazar: () => void;
  cambiarPreferencias: () => void;
} {
  const estado = useSyncExternalStore(suscribir, leer, () => null);
  return {
    estado,
    aceptar: () => guardar("aceptadas"),
    rechazar: () => {
      apagarAnalytics();
      guardar("rechazadas");
    },
    cambiarPreferencias: () => guardar("pendiente"),
  };
}
