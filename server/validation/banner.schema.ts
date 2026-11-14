import "server-only";
import { z } from "zod";
import { enlaceSeguro } from "@/lib/popup";
import { listaTexto, textoRequerido, urlOVacio } from "@/server/validation/common";

// Mismo criterio que el popup: ruta interna (/…) o https. Vacío = sin enlace.
const enlaceBanner = urlOVacio.refine((v) => v === "" || enlaceSeguro(v), {
  message: "Usa una ruta interna (/…) o un enlace https",
});

export const bannerCrearSchema = z.object({
  titulo: textoRequerido(200),
  imagenUrl: urlOVacio.min(1, "Obligatorio"),
  posicion: z.enum(["top-left", "top-right", "middle-full", "bottom-left", "bottom-right"]),
  enlace: enlaceBanner.optional(),
  ubicaciones: listaTexto(50, 100).optional(),
  activo: z.boolean().optional(),
});

export const bannerActualizarSchema = bannerCrearSchema.partial();
