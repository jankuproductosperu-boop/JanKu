import "server-only";
import { z } from "zod";
import { enlaceSeguro } from "@/lib/popup";
import { texto } from "@/server/validation/common";

const PREFIJO_IMAGEN = "https://res.cloudinary.com/";

export const popupGuardarSchema = z
  .object({
    imagenUrl: texto(500),
    textoBoton: texto(40),
    destinoTipo: z.enum(["producto", "categoria", "promocion", "enlace"]),
    destinoRef: texto(100),
    enlace: texto(500),
    activo: z.boolean(),
    desde: z.iso.datetime().nullable(),
    hasta: z.iso.datetime().nullable(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.desde && d.hasta && Date.parse(d.hasta) < Date.parse(d.desde)) {
      ctx.addIssue({ code: "custom", path: ["hasta"], message: "La fecha final no puede ser anterior a la inicial" });
    }
    if (d.enlace && !enlaceSeguro(d.enlace)) {
      ctx.addIssue({ code: "custom", path: ["enlace"], message: "Usa una ruta interna (/…) o un enlace https" });
    }
    if (d.imagenUrl && !d.imagenUrl.startsWith(PREFIJO_IMAGEN)) {
      ctx.addIssue({ code: "custom", path: ["imagenUrl"], message: "La imagen debe estar subida a Cloudinary" });
    }
    // Para activarlo hace falta que esté completo.
    if (d.activo) {
      if (!d.imagenUrl) ctx.addIssue({ code: "custom", path: ["imagenUrl"], message: "Agrega una imagen" });
      if (!d.enlace) ctx.addIssue({ code: "custom", path: ["enlace"], message: "Elige a dónde lleva el botón" });
      if (!d.textoBoton) ctx.addIssue({ code: "custom", path: ["textoBoton"], message: "Escribe el texto del botón" });
    }
  });
