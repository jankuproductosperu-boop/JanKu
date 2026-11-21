import "server-only";
import { z } from "zod";
import { enteroNoNegativo, texto, textoRequerido, urlOVacio } from "@/server/validation/common";

export const categoriaCrearSchema = z.object({
  nombre: textoRequerido(100),
  descripcion: texto(500).optional(),
  imagenUrl: urlOVacio.optional(),
  activo: z.boolean().optional(),
  orden: enteroNoNegativo.optional(),
  // Slug de la categoría madre (D-57, D-88). "" = sin madre. El servicio valida que exista y que sea un solo nivel.
  padre: z.string().trim().max(100).regex(/^[a-z0-9-]*$/, "Slug inválido").optional(),
});

// El endpoint actual exige `nombre` también al actualizar
export const categoriaActualizarSchema = categoriaCrearSchema;
