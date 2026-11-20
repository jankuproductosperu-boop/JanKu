import "server-only";
import { z } from "zod";
import { normalizarTelefono } from "@/lib/phone";
import { dinero } from "@/server/validation/common";
import type { ComplaintCreateInput, TipoDocumento } from "@/types";

const TIPOS_DOCUMENTO = ["DNI", "CE", "PASAPORTE"] as const;

/** Formato de cada documento (se comprueba en superRefine, según el tipo elegido). */
const FORMATO_DOCUMENTO: Record<TipoDocumento, { re: RegExp; mensaje: string }> = {
  DNI: { re: /^\d{8}$/, mensaje: "El DNI tiene 8 dígitos" },
  CE: { re: /^[A-Z0-9]{8,12}$/, mensaje: "El carné de extranjería tiene de 8 a 12 caracteres, sin espacios" },
  PASAPORTE: { re: /^[A-Z0-9]{6,12}$/, mensaje: "El pasaporte tiene de 6 a 12 caracteres, sin espacios" },
};

const nombre = z
  .string({ error: "Ingresa el nombre completo" })
  .trim()
  .min(3, "Ingresa el nombre completo")
  .max(150, "Máximo 150 caracteres");
const tipoDocumento = z.enum(TIPOS_DOCUMENTO, { error: "Elige el tipo de documento" });
const numeroDocumento = z
  .string({ error: "Ingresa el número de documento" })
  .trim()
  .toUpperCase()
  .min(1, "Ingresa el número de documento")
  .max(20, "Máximo 20 caracteres");

/** Texto libre obligatorio con mínimo y máximo, mensajes en español. */
const textoEntre = (min: number, max: number, vacio: string) =>
  z
    .string({ error: vacio })
    .trim()
    .min(min, min > 1 ? `Escribe al menos ${min} caracteres` : vacio)
    .max(max, `Máximo ${max} caracteres`);

// Endpoint nuevo y público: .strict() en todos los niveles (N1-4). Ningún campo del proveedor llega
// del navegador: se copian de LEGAL en el servidor.
export const reclamoCrearSchema = z
  .object({
    consumidor: z
      .object({
        nombre,
        tipoDocumento,
        numeroDocumento,
        domicilio: textoEntre(5, 300, "Ingresa tu domicilio"),
        telefono: z.string({ error: "Ingresa tu celular" }).trim().max(20),
        email: z
          .string({ error: "Ingresa tu correo" })
          .trim()
          .toLowerCase()
          .max(200, "Máximo 200 caracteres")
          .pipe(z.email("Ingresa un correo válido")),
      })
      .strict(),
    representante: z.object({ nombre, tipoDocumento, numeroDocumento }).strict().optional(),
    bien: z
      .object({
        tipo: z.enum(["producto", "servicio"], { error: "Elige producto o servicio" }),
        descripcion: textoEntre(3, 500, "Describe el producto o servicio"),
        montoReclamado: dinero.optional(),
      })
      .strict(),
    pedidoCodigo: z
      .string()
      .trim()
      .toUpperCase()
      .max(30, "Máximo 30 caracteres")
      .regex(/^[A-Z0-9-]*$/, "Solo letras, números y guiones")
      .optional(),
    tipo: z.enum(["reclamo", "queja"], { error: "Elige reclamo o queja" }),
    detalle: textoEntre(20, 3000, "Describe lo ocurrido"),
    pedidoConsumidor: textoEntre(5, 1000, "Indica qué pides"),
    declaraVeracidad: z.literal(true, { error: "Debes declarar que los datos son verdaderos" }),
    website: z.string().max(0).optional(), // trampa anti-bots: debe llegar vacío o no llegar
  })
  .strict()
  .superRefine((d, ctx) => {
    if (!normalizarTelefono(d.consumidor.telefono)) {
      ctx.addIssue({ code: "custom", path: ["consumidor", "telefono"], message: "Ingresa un celular válido de 9 dígitos" });
    }
    const documentos = [
      { path: ["consumidor", "numeroDocumento"], tipo: d.consumidor.tipoDocumento, numero: d.consumidor.numeroDocumento },
      ...(d.representante
        ? [{ path: ["representante", "numeroDocumento"], tipo: d.representante.tipoDocumento, numero: d.representante.numeroDocumento }]
        : []),
    ];
    for (const doc of documentos) {
      const formato = FORMATO_DOCUMENTO[doc.tipo];
      if (!formato.re.test(doc.numero)) ctx.addIssue({ code: "custom", path: doc.path, message: formato.mensaje });
    }
  });

export const reclamoResponderSchema = z
  .object({
    respuesta: z
      .string({ error: "Escribe la respuesta" })
      .trim()
      .min(10, "Escribe al menos 10 caracteres")
      .max(3000, "Máximo 3000 caracteres"),
  })
  .strict();

export const reclamoListaQuerySchema = z.object({
  estado: z.enum(["pendiente", "respondido"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// Comprobación de compilación: types/complaint.ts debe coincidir con el esquema.
type Esquema = z.infer<typeof reclamoCrearSchema>;
type Coincide = Esquema extends ComplaintCreateInput ? (ComplaintCreateInput extends Esquema ? true : never) : never;
const coincide: Coincide = true;
void coincide;
