import "server-only";
import { z } from "zod";
import { ORDER_ESTADOS } from "@/lib/orderStatus";
import { normalizarTelefono } from "@/lib/phone";
import { esDepartamento } from "@/lib/shipping";
import { objectId } from "@/server/validation/common";
import type { OrderCreateInput } from "@/types";

type EntregaCampo = "direccion" | "referencia" | "ciudad" | "departamento" | "provincia" | "puntoEntregaId";

/** Campos que NO puede traer cada método (D-71/72/73). Si llegan, 400 aunque vengan vacíos. */
const PROHIBIDOS: Record<"delivery_huancayo" | "punto_entrega" | "envio_provincia", EntregaCampo[]> = {
  delivery_huancayo: ["ciudad", "departamento", "provincia", "puntoEntregaId"],
  punto_entrega: ["direccion", "referencia", "ciudad", "departamento", "provincia"],
  envio_provincia: ["direccion", "referencia", "puntoEntregaId"],
};

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
        // "recojo" está en el enum solo para que el tipo coincida con MetodoEntrega; se rechaza abajo.
        metodo: z.enum(["delivery_huancayo", "punto_entrega", "envio_provincia", "recojo"]),
        direccion: z.string().trim().max(200).optional(),
        referencia: z.string().trim().max(200).optional(),
        ciudad: z.string().trim().max(100).optional(),
        departamento: z.string().trim().max(100).optional(),
        provincia: z.string().trim().max(100).optional(),
        puntoEntregaId: objectId.optional(),
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
    const e = d.entrega;
    const falta = (campo: EntregaCampo, message: string) =>
      ctx.addIssue({ code: "custom", path: ["entrega", campo], message });

    if (e.metodo === "recojo") {
      ctx.addIssue({ code: "custom", path: ["entrega", "metodo"], message: "Este método de entrega ya no está disponible" });
      return;
    }
    for (const campo of PROHIBIDOS[e.metodo]) {
      if (e[campo] !== undefined) falta(campo, "No corresponde a este método de entrega");
    }

    if (e.metodo === "delivery_huancayo" && !(e.direccion ?? "").length) falta("direccion", "Ingresa tu dirección");
    if (e.metodo === "punto_entrega" && !e.puntoEntregaId) falta("puntoEntregaId", "Elige un punto de entrega");
    if (e.metodo === "envio_provincia") {
      if (!esDepartamento(e.departamento ?? "")) falta("departamento", "Elige un departamento de la lista");
      if (!(e.provincia ?? "").length) falta("provincia", "Ingresa tu provincia");
      if (!(e.ciudad ?? "").length) falta("ciudad", "Ingresa tu ciudad");
    }
  });

// ── Administración (fase 17) ─────────────────────────────────────────────────────────────────────────

export const pedidoAccionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("confirmar") }).strict(),
  z.object({ accion: z.literal("enviar"), nota: z.string().trim().max(200).optional() }).strict(),
  z.object({ accion: z.literal("entregar") }).strict(),
  z.object({ accion: z.literal("cancelar"), motivo: z.string().trim().min(3).max(200) }).strict(),
  z
    .object({
      accion: z.literal("pago"),
      estado: z.enum(["pendiente", "pagado", "reembolsado"]),
      metodo: z.enum(["", "yape", "plin", "transferencia", "efectivo", "otro"]),
      referencia: z.string().trim().max(100).optional(),
    })
    .strict(),
  z.object({ accion: z.literal("nota"), nota: z.string().trim().min(1).max(500) }).strict(),
]);

export const pedidoListaQuerySchema = z.object({
  estado: z.enum(ORDER_ESTADOS).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// Comprobación de compilación: types/order.ts debe coincidir con el esquema.
type Esquema = z.infer<typeof pedidoCrearSchema>;
type Coincide = Esquema extends OrderCreateInput ? (OrderCreateInput extends Esquema ? true : never) : never;
const coincide: Coincide = true;
void coincide;
