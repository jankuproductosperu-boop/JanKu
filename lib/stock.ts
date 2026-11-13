import type { StockEstado } from "@/types";

export function estadoDeStock(cantidad: number, minimo = 5): StockEstado {
  if (cantidad <= 0) return "Agotado";
  if (cantidad <= minimo) return "Limitado";
  return "Disponible";
}
