"use client";

import { usePathname } from "next/navigation";
import { EsqueletoGenerico, EsqueletoInicio } from "@/Components/Esqueletos/Esqueletos";

// Fase 27 (D-91): app/(tienda)/loading.tsx cubre el inicio y, por herencia, las páginas de la tienda que
// no tienen esqueleto propio. Solo el inicio lleva la forma del carrusel; el resto, una genérica.
export function EsqueletoTienda() {
  const ruta = usePathname();
  return ruta === "/" ? <EsqueletoInicio /> : <EsqueletoGenerico />;
}
