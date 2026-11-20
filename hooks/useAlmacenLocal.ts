"use client";
import { useSyncExternalStore } from "react";

// Estado guardado en localStorage, leído con useSyncExternalStore.
// En el servidor y durante la hidratación se usa `vacio` (igual que el HTML del servidor);
// después React pasa al valor guardado sin un setState dentro de un efecto.
// Si localStorage no está disponible, el estado funciona solo en memoria.

export type AlmacenLocal<T> = {
  subscribe: (oyente: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (siguiente: T | ((anterior: T) => T)) => void;
};

/**
 * `leer` convierte el texto guardado en el valor (y decide qué hacer si está roto).
 * `vacio` debe ser una constante: se devuelve siempre la misma referencia.
 */
export function crearAlmacenLocal<T>(clave: string, leer: (texto: string) => T, vacio: T): AlmacenLocal<T> {
  const oyentes = new Set<() => void>();
  let cargado = false;
  let valor = vacio;

  const cargar = () => {
    if (cargado) return;
    cargado = true;
    try {
      const texto = localStorage.getItem(clave);
      if (texto) valor = leer(texto);
    } catch {
      // sin almacenamiento: se sigue con `vacio`
    }
  };

  return {
    subscribe: (oyente) => {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    getSnapshot: () => {
      cargar();
      return valor;
    },
    getServerSnapshot: () => vacio,
    set: (siguiente) => {
      cargar();
      valor = typeof siguiente === "function" ? (siguiente as (anterior: T) => T)(valor) : siguiente;
      try {
        localStorage.setItem(clave, JSON.stringify(valor));
      } catch {
        // sin almacenamiento: el valor sigue en memoria
      }
      oyentes.forEach((o) => o());
    },
  };
}

export function useAlmacenLocal<T>(almacen: AlmacenLocal<T>): T {
  return useSyncExternalStore(almacen.subscribe, almacen.getSnapshot, almacen.getServerSnapshot);
}
