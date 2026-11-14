"use client";
import { useSyncExternalStore } from "react";

export type Tema = "claro" | "oscuro";
const CLAVE = "admin-tema";
const EVENTO = "admin-tema-cambio";

// Respaldo en memoria por si el navegador no permite guardar (modo privado, etc.).
let temaEnMemoria: Tema | null = null;

function leerTema(): Tema {
  if (temaEnMemoria) return temaEnMemoria;
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch { /* sin almacenamiento: se usa la preferencia del sistema */ }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  } catch { return "claro"; }
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  let consulta: MediaQueryList | null = null;
  try {
    consulta = window.matchMedia("(prefers-color-scheme: dark)");
    consulta.addEventListener("change", avisar);
  } catch { /* sin matchMedia */ }
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
    consulta?.removeEventListener("change", avisar);
  };
}

// En el servidor (y en el primer render de hidratación) siempre es "claro": así el HTML coincide.
// Tras hidratar, React vuelve a leer el tema real sin error.
const temaDelServidor = (): Tema => "claro";

export function useTema() {
  const tema = useSyncExternalStore(suscribir, leerTema, temaDelServidor);

  const alternar = () => {
    const nuevo: Tema = tema === "oscuro" ? "claro" : "oscuro";
    temaEnMemoria = nuevo;
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* la elección no se recuerda entre visitas */ }
    window.dispatchEvent(new Event(EVENTO));
  };

  return { tema, alternar };
}
