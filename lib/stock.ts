import type { StockEstado } from "@/types";

export function estadoDeStock(cantidad: number, minimo = 5): StockEstado {
  if (cantidad <= 0) return "Agotado";
  if (cantidad <= minimo) return "Limitado";
  return "Disponible";
}

export type ModoAjusteStock = "sumar" | "restar" | "fijar";

/** Cantidad que quedaría tras el ajuste. Puede ser negativa: quien llama decide si la rechaza. */
export function stockResultante(modo: ModoAjusteStock, antes: number, cantidad: number): number {
  if (modo === "sumar") return antes + cantidad;
  if (modo === "restar") return antes - cantidad;
  return cantidad;
}

/** Tipo de movimiento por defecto según el modo (sección 5 de la fase 13). */
export function tipoPorDefecto(modo: ModoAjusteStock): "entrada" | "salida" | "ajuste" {
  if (modo === "sumar") return "entrada";
  if (modo === "restar") return "salida";
  return "ajuste";
}
