import "server-only";
import { z } from "zod";
import { enteroNoNegativo, texto, textoRequerido } from "@/server/validation/common";

// Endpoints nuevos: .strict(). No hay borrado: se desactiva con `activo: false` (D-72).
export const puntoCrearSchema = z
  .object({
    nombre: textoRequerido(100),
    direccion: textoRequerido(200),
    referencia: texto(200).optional(),
    horario: texto(200).optional(),
    activo: z.boolean().optional(),
    orden: enteroNoNegativo.optional(),
  })
  .strict();

export const puntoActualizarSchema = puntoCrearSchema.partial().strict();
