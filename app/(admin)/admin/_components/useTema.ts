"use client";
import { useState } from "react";

export type Tema = "claro" | "oscuro";
const CLAVE = "admin-tema";

function temaInicial(): Tema {
  if (typeof window === "undefined") return "claro";
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch { /* sin almacenamiento: se usa la preferencia del sistema */ }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  } catch { return "claro"; }
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial);
  const alternar = () => {
    const nuevo: Tema = tema === "oscuro" ? "claro" : "oscuro";
    setTema(nuevo);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* la elección no se recuerda */ }
  };
  return { tema, alternar };
}
