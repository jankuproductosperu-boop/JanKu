// Reglas de entrega compartidas por el navegador y el servidor (D-71, D-73). Funciones puras.

/** Los 24 departamentos del Perú más la Provincia Constitucional del Callao (Q3: solo departamentos). */
export const DEPARTAMENTOS = [
  "Amazonas",
  "Áncash",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Ica",
  "Junín",
  "La Libertad",
  "Lambayeque",
  "Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martín",
  "Tacna",
  "Tumbes",
  "Ucayali",
] as const;

export type Departamento = (typeof DEPARTAMENTOS)[number];

export function esDepartamento(valor: string): valor is Departamento {
  return (DEPARTAMENTOS as readonly string[]).includes(valor);
}

/**
 * D-71: el delivery en Huancayo es gratis si ALGÚN ítem de tipo producto tiene `deliveryHuancayo === true`
 * (igual que la etiqueta de ProductCard). Las promociones nunca cuentan.
 */
export function entregaGratis(
  items: { tipo: "producto" | "promocion"; deliveryHuancayo?: boolean | null }[],
): boolean {
  return items.some((i) => i.tipo === "producto" && i.deliveryHuancayo === true);
}

/**
 * Para el navegador (solo mostrar; decide el servidor): cruza el carrito con los productos públicos.
 * Un ítem sin `tipo` (carritos antiguos) se trata como producto; si su id no está entre los productos
 * (p. ej. es una promoción), no cuenta.
 */
export function carritoConEntregaGratis(
  carrito: { _id: string; tipo?: "producto" | "promocion" }[],
  productos: { _id: string; deliveryHuancayo?: boolean | null }[],
): boolean {
  const porId = new Map(productos.map((p) => [p._id, p.deliveryHuancayo]));
  return entregaGratis(
    carrito.map((i) => ({ tipo: i.tipo ?? "producto", deliveryHuancayo: porId.get(i._id) ?? null })),
  );
}
