import "server-only";
import { z } from "zod";
import { enteroNoNegativo, texto, textoRequerido, urlOVacio } from "@/server/validation/common";

export const categoriaCrearSchema = z.object({
  nombre: textoRequerido(100),
  descripcion: texto(500).optional(),
  imagenUrl: urlOVacio.optional(),
  activo: z.boolean().optional(),
  orden: enteroNoNegativo.optional(),
});

// El endpoint actual exige `nombre` también al actualizar
export const categoriaActualizarSchema = categoriaCrearSchema;
