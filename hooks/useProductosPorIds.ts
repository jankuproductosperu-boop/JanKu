"use client";
import { useEffect, useState } from "react";
import { fetchWithCache } from "@/lib/cache";
import type { Product } from "@/types";

/**
 * Productos públicos con esos ids (fase 24): pide al servidor solo esos, no el catálogo entero.
 * `ids` en el formato de idsParaCatalogo. Devuelve null mientras carga y [] si no hay ids.
 */
export function useProductosPorIds(ids: string): Product[] | null {
  const [cargado, setCargado] = useState<{ clave: string; productos: Product[] } | null>(null);

  useEffect(() => {
    if (!ids) return;
    let activo = true;
    fetchWithCache<Product[]>(`/api/products?ids=${ids}`).then((productos) => {
      if (activo) setCargado({ clave: ids, productos });
    });
    return () => {
      activo = false;
    };
  }, [ids]);

  if (!ids) return [];
  return cargado?.clave === ids ? cargado.productos : null;
}
