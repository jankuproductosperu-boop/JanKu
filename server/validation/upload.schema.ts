import "server-only";
import { z } from "zod";

// FormData entrega null o "" para campos ausentes: ambos cuentan como "no enviado".
const vacioComoUndefined = (v: unknown) => (v === null || v === "" ? undefined : v);
const opcional = <T extends z.ZodType>(schema: T) => z.preprocess(vacioComoUndefined, schema.optional());

export const SUBCARPETAS_BANNER = ["home", "categorias", "campanas"] as const;
export const SUBCARPETAS_PROMOCION = ["ofertas", "combos", "publicidad"] as const;

export const uploadCamposSchema = z.object({
  entity: opcional(z.enum(["producto", "banner", "promocion"])).transform((v) => v ?? "producto"),
  nombreProducto: opcional(z.string().trim().max(200)),
  categoriaSlug: opcional(z.string().trim().max(100)),
  tags: opcional(z.string().max(500)),
  existingCount: opcional(z.coerce.number().int().min(0).max(50)).transform((v) => v ?? 0),
  bannerNombre: opcional(z.string().trim().max(200)),
  bannerSubcarpeta: opcional(z.enum(SUBCARPETAS_BANNER)).transform((v) => v ?? "home"),
  promocionNombre: opcional(z.string().trim().max(200)),
  promocionSubcarpeta: opcional(z.enum(SUBCARPETAS_PROMOCION)).transform((v) => v ?? "ofertas"),
});

export type UploadCampos = z.infer<typeof uploadCamposSchema>;

export const eliminarImagenSchema = z.object({
  publicId: z.string().min(1, "Se requiere publicId").max(300),
});
