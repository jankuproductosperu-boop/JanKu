// Migración 002 · fase 13. Rellena los campos de producto que falten (solo los que falten).
//   node scripts/migrations/002-product-defaults.mjs            → simula
//   node scripts/migrations/002-product-defaults.mjs --apply    → escribe (solo el dueño)
//
// Reglas (docs/plan/02-datos.md §4.2):
//   activo → true · stockMinimo → 5 · imagenes → [] · tags → []
//   stockCantidad (si falta) según la etiqueta actual: Disponible 20 · Limitado 3 · Agotado 0 · sin valor 10
// NO recalcula `stock` (el texto que ve hoy el cliente) y NO toca campos que ya existen.

import { ejecutarMigracion } from "./_runner.mjs";

const CANTIDAD_POR_ETIQUETA = { Disponible: 20, Limitado: 3, Agotado: 0 };

await ejecutarMigracion({
  nombre: "002-product-defaults",
  descripcion: "Productos con campos ausentes (activo, stockCantidad, stockMinimo, imagenes, tags) reciben su valor por defecto.",
  coleccion: "products",
  filtro: {
    $or: [
      { activo: { $exists: false } },
      { stockCantidad: { $exists: false } },
      { stockMinimo: { $exists: false } },
      { imagenes: { $exists: false } },
      { tags: { $exists: false } },
    ],
  },
  // Solo se incluye en el $set lo que falta: nunca se pisa un valor existente.
  cambio: (doc) => ({
    ...(doc.activo === undefined ? { activo: true } : {}),
    ...(doc.stockMinimo === undefined ? { stockMinimo: 5 } : {}),
    ...(doc.imagenes === undefined ? { imagenes: [] } : {}),
    ...(doc.tags === undefined ? { tags: [] } : {}),
    ...(doc.stockCantidad === undefined
      ? { stockCantidad: CANTIDAD_POR_ETIQUETA[doc.stock] ?? 10 }
      : {}),
  }),
  camposEjemplo: ["nombre", "stock"],
});
