import "server-only";
import { z } from "zod";
import { objectId } from "@/server/validation/common";
import type { CouponInput } from "@/types";

// Endpoints nuevos: .strict(). `usosActuales` y `creadoPor` no se aceptan nunca desde fuera.

const codigo = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "4 a 20 caracteres: letras, números o guion");
const fecha = z.union([z.null(), z.coerce.date()]);

const campos = {
  descripcion: z.string().trim().max(200).optional(),
  tipo: z.enum(["porcentaje", "monto_fijo"]),
  valor: z.coerce.number().positive().max(999999),
  topeDescuento: z.union([z.null(), z.coerce.number().positive().max(999999)]).optional(),
  montoMinimo: z.coerce.number().min(0).max(999999).default(0),
  fechaInicio: fecha.optional(),
  fechaFin: fecha.optional(),
  usosMaximos: z.union([z.null(), z.coerce.number().int().min(1).max(1000000)]).optional(),
  usosPorCliente: z.coerce.number().int().min(1).max(1000).default(1),
  acumulable: z.boolean().default(false),
  activo: z.boolean().default(true),
};

type Reglas = {
  tipo?: "porcentaje" | "monto_fijo";
  valor?: number;
  topeDescuento?: number | null;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
};

/** Reglas entre campos. En la actualización solo se comprueban con los campos que llegan. */
function reglas(d: Reglas, ctx: z.RefinementCtx) {
  if (d.tipo === "porcentaje" && d.valor !== undefined && d.valor > 100) {
    ctx.addIssue({ code: "custom", path: ["valor"], message: "El porcentaje no puede superar 100" });
  }
  if (d.tipo === "monto_fijo" && d.topeDescuento != null) {
    ctx.addIssue({ code: "custom", path: ["topeDescuento"], message: "El tope solo aplica a porcentaje" });
  }
  if (d.fechaInicio && d.fechaFin && !(d.fechaInicio < d.fechaFin)) {
    ctx.addIssue({ code: "custom", path: ["fechaFin"], message: "Debe ser posterior al inicio" });
  }
}

export const cuponCrearSchema = z
  .object({ codigo, ...campos })
  .strict()
  .superRefine((d, ctx) => reglas(d, ctx));

/**
 * Mismos campos, todos opcionales, SIN `codigo` (no es editable). Sin `.default()`: lo que no llega no se toca.
 * Las reglas que dependen del documento guardado (p. ej. porcentaje > 100 cuando solo llega `valor`)
 * las completa actualizarCupon contra la base.
 */
export const cuponActualizarSchema = z
  .object({
    descripcion: campos.descripcion,
    tipo: campos.tipo.optional(),
    valor: campos.valor.optional(),
    topeDescuento: campos.topeDescuento,
    montoMinimo: z.coerce.number().min(0).max(999999).optional(),
    fechaInicio: campos.fechaInicio,
    fechaFin: campos.fechaFin,
    usosMaximos: campos.usosMaximos,
    usosPorCliente: z.coerce.number().int().min(1).max(1000).optional(),
    acumulable: z.boolean().optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .superRefine((d, ctx) => reglas(d, ctx));

export const cuponValidarSchema = z
  .object({
    codigo: z.string().trim().min(1).max(30),
    items: z
      // varianteId igual que en POST /api/orders (fase 19, aprobado por el dueño): el precio sale de la variante.
      .array(
        z
          .object({ id: objectId, varianteId: objectId.optional(), cantidad: z.coerce.number().int().min(1).max(99) })
          .strict(),
      )
      .min(1)
      .max(50),
    telefono: z.string().trim().max(20).optional(),
  })
  .strict();

// Comprobación de compilación: CouponInput debe coincidir con lo que produce cuponCrearSchema.
type Esquema = z.infer<typeof cuponCrearSchema>;
type Coincide = Esquema extends CouponInput ? (CouponInput extends Esquema ? true : never) : never;
const coincide: Coincide = true;
void coincide;
