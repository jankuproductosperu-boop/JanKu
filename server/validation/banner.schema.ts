import "server-only";
import { z } from "zod";
import { listaTexto, textoRequerido, urlOVacio } from "@/server/validation/common";

export const bannerCrearSchema = z.object({
  titulo: textoRequerido(200),
  imagenUrl: urlOVacio.min(1, "Obligatorio"),
  posicion: z.enum(["top-left", "top-right", "middle-full", "bottom-left", "bottom-right"]),
  enlace: urlOVacio.optional(),
  ubicaciones: listaTexto(50, 100).optional(),
  activo: z.boolean().optional(),
});

export const bannerActualizarSchema = bannerCrearSchema.partial();
