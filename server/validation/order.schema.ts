import "server-only";
import { z } from "zod";
import { normalizarTelefono } from "@/lib/phone";
import { objectId } from "@/server/validation/common";
import type { OrderCreateInput } from "@/types";

// Endpoint nuevo: .strict(). No hay campos de precio, descuento ni total (N1-5): si llegan, 400.
export const pedidoCrearSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: objectId,
            varianteId: objectId.optional(),
            cantidad: z.coerce.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    cliente: z
      .object({
        nombre: z.string().trim().min(2).max(100),
        telefono: z.string().trim().max(20),
        email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]).optional(),
      })
      .strict(),
    entrega: z
      .object({
        metodo: z.enum(["delivery_huancayo", "recojo", "envio_provincia"]),
        direccion: z.string().trim().max(200).optional(),
        referencia: z.string().trim().max(200).optional(),
        ciudad: z.string().trim().max(100).optional(),
        departamento: z.string().trim().max(100).optional(),
      })
      .strict(),
    notas: z.string().trim().max(500).optional(),
    website: z.string().max(0).optional(), // trampa anti-bots: debe llegar vacío o no llegar
  })
  .strict()
  .superRefine((d, ctx) => {
    if (!normalizarTelefono(d.cliente.telefono)) {
      ctx.addIssue({ code: "custom", path: ["cliente", "telefono"], message: "Ingresa un celular válido de 9 dígitos" });
    }
    if (d.entrega.metodo !== "recojo" && !(d.entrega.direccion ?? "").length) {
      ctx.addIssue({ code: "custom", path: ["entrega", "direccion"], message: "Ingresa tu dirección" });
    }
    if (d.entrega.metodo === "envio_provincia") {
      if (!(d.entrega.ciudad ?? "").length) {
        ctx.addIssue({ code: "custom", path: ["entrega", "ciudad"], message: "Ingresa tu ciudad" });
      }
      if (!(d.entrega.departamento ?? "").length) {
        ctx.addIssue({ code: "custom", path: ["entrega", "departamento"], message: "Ingresa tu departamento" });
      }
    }
  });

// Comprobación de compilación: types/order.ts debe coincidir con el esquema.
type Esquema = z.infer<typeof pedidoCrearSchema>;
type Coincide = Esquema extends OrderCreateInput ? (OrderCreateInput extends Esquema ? true : never) : never;
const coincide: Coincide = true;
void coincide;
