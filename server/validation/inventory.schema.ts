import "server-only";
import { z } from "zod";
import { objectId } from "@/server/validation/common";

export const ajusteStockSchema = z
  .object({
    productId: objectId,
    variantId: objectId.optional(), // obligatorio si el producto tiene variantes (409 USA_VARIANTE)
    modo: z.enum(["sumar", "restar", "fijar"]),
    cantidad: z.coerce.number().int().min(0).max(999999),
    motivo: z.string().trim().max(200).optional(),
    // Stock que veía el panel: si cambió entretanto, 409 STOCK_CAMBIO (no se pisa un ajuste ajeno).
    esperado: z.coerce.number().int().min(0).max(999999).optional(),
  })
  .strict()
  .refine((d) => d.modo !== "fijar" || (d.motivo ?? "").length >= 3, {
    path: ["motivo"],
    message: "Indica el motivo del ajuste",
  });

export const movimientosQuerySchema = z.object({
  productId: objectId,
  variantId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
