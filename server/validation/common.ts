import "server-only";
import { z } from "zod";
import { redondear2 } from "@/lib/money";

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identificador inválido");
export const texto = (max: number) => z.string().trim().max(max);
export const textoRequerido = (max: number) => z.string().trim().min(1, "Obligatorio").max(max);
export const dinero = z.coerce
  .number()
  .finite()
  .min(0, "No puede ser negativo")
  .max(999999)
  .transform(redondear2);
export const enteroNoNegativo = z.coerce.number().int().min(0).max(999999);
export const listaTexto = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().max(maxLen)).max(maxItems);
// No se valida formato: hay URLs antiguas y rutas relativas
export const urlOVacio = z.string().trim().max(500);
