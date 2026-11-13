import "server-only";
import { z } from "zod";
import { dinero, textoRequerido } from "@/server/validation/common";

const TIPOS = ["porcentaje", "monto_fijo"] as const;

const nivelBase = z.object({
  nombre: textoRequerido(100),
  montoMinimo: dinero,
  valorDescuento: dinero,
  tipoDescuento: z.enum(TIPOS).default("porcentaje"),
  activo: z.boolean().optional(),
});

const porcentajeValido = (d: { tipoDescuento?: string; valorDescuento?: number }) =>
  d.tipoDescuento !== "porcentaje" || d.valorDescuento === undefined || d.valorDescuento <= 100;
const regla = {
  message: "El porcentaje no puede superar 100",
  path: ["valorDescuento"],
};

export const nivelCrearSchema = nivelBase.refine(porcentajeValido, regla);

// En actualización parcial no se aplica el valor por defecto de tipoDescuento
export const nivelActualizarSchema = nivelBase
  .partial()
  .extend({ tipoDescuento: z.enum(TIPOS).optional() })
  .refine(porcentajeValido, regla);
