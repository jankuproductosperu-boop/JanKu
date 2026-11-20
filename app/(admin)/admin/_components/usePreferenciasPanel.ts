"use client";
import { useSyncExternalStore } from "react";
import { restablecerTema } from "@/app/(admin)/admin/_components/useTema";

// Preferencias visuales del panel (fase 23a, D-83). Viven solo en el navegador de cada persona:
// no viajan al servidor. Si el navegador no deja guardar, se usan en memoria hasta recargar.

export type TamanoBarra = "normal" | "compacta" | "iconos";
export type ColorBarra = "azul" | "blanca" | "degradado";
export type AnchoPanel = "completo" | "centrado";

type Preferencia<T extends string> = { clave: string; valores: readonly T[]; porDefecto: T };

const TAMANO: Preferencia<TamanoBarra> = { clave: "admin-barra-tamano", valores: ["normal", "compacta", "iconos"], porDefecto: "normal" };
const COLOR: Preferencia<ColorBarra> = { clave: "admin-barra-color", valores: ["azul", "blanca", "degradado"], porDefecto: "azul" };
const ANCHO: Preferencia<AnchoPanel> = { clave: "admin-ancho", valores: ["completo", "centrado"], porDefecto: "completo" };

const EVENTO = "admin-preferencias-cambio";
const enMemoria = new Map<string, string>();

function leer<T extends string>(p: Preferencia<T>): T {
  const memoria = enMemoria.get(p.clave);
  let valor: string | null = memoria ?? null;
  if (valor === null) {
    try {
      valor = localStorage.getItem(p.clave);
    } catch {
      /* sin almacenamiento */
    }
  }
  // Un valor desconocido (versión vieja, edición a mano) vuelve al de por defecto.
  return (p.valores as readonly string[]).includes(valor ?? "") ? (valor as T) : p.porDefecto;
}

function guardar<T extends string>(p: Preferencia<T>, valor: T | null) {
  if (valor === null) enMemoria.delete(p.clave);
  else enMemoria.set(p.clave, valor);
  try {
    if (valor === null) localStorage.removeItem(p.clave);
    else localStorage.setItem(p.clave, valor);
  } catch {
    /* la elección no se recuerda entre visitas */
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

// Los valores son textos: useSyncExternalStore los compara por valor, sin objetos nuevos en cada lectura.
function usePreferencia<T extends string>(p: Preferencia<T>): T {
  return useSyncExternalStore(suscribir, () => leer(p), () => p.porDefecto);
}

export function usePreferenciasPanel() {
  const tamanoBarra = usePreferencia(TAMANO);
  const colorBarra = usePreferencia(COLOR);
  const ancho = usePreferencia(ANCHO);

  return {
    tamanoBarra,
    colorBarra,
    ancho,
    setTamanoBarra: (v: TamanoBarra) => guardar(TAMANO, v),
    setColorBarra: (v: ColorBarra) => guardar(COLOR, v),
    setAncho: (v: AnchoPanel) => guardar(ANCHO, v),
    restablecer: () => {
      guardar(TAMANO, null);
      guardar(COLOR, null);
      guardar(ANCHO, null);
      restablecerTema();
    },
  };
}
