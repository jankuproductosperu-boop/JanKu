// Ayudas puras para pedir al servidor solo la parte del catálogo que usa cada página (fase 24).

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
export const MAX_IDS_CATALOGO = 100;

/**
 * Ids únicos y ordenados de los productos (no promociones) de una lista, en el formato de `?ids=`.
 * Ignora ids con formato inválido (p. ej. carritos viejos guardados en el navegador). "" si no hay ninguno.
 */
export function idsParaCatalogo(items: { _id: string; tipo?: "producto" | "promocion" }[]): string {
  const ids = new Set<string>();
  for (const i of items) {
    if ((i.tipo ?? "producto") === "producto" && OBJECT_ID.test(i._id)) ids.add(i._id);
  }
  return [...ids].sort().slice(0, MAX_IDS_CATALOGO).join(",");
}
