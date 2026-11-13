import "server-only";
import { z } from "zod";
import {
  dinero,
  enteroNoNegativo,
  listaTexto,
  texto,
  textoRequerido,
  urlOVacio,
} from "@/server/validation/common";

export const promocionCrearSchema = z.object({
  titulo: textoRequerido(200),
  precio: dinero,
  imagenUrl: urlOVacio.min(1, "Obligatorio"),
  descripcion: texto(2000).optional(),
  descripcionCompleta: texto(20000).optional(),
  precioAnterior: dinero.optional(),
  imagenesAdicionales: z.array(urlOVacio).max(10).optional(),
  tipoEtiqueta: z.enum(["Combo", "2x1", "Descuento", "Oferta", "Nuevo"]).optional(),
  stock: z.enum(["Disponible", "Limitado", "Agotado"]).optional(),
  activo: z.boolean().optional(),
  orden: enteroNoNegativo.optional(),
  whatsappLink: urlOVacio.optional(),
  whatsappNumero: texto(20).optional(),
  caracteristicas: listaTexto(50, 500).optional(),
  metaTitulo: texto(200).optional(),
  metaDescripcion: texto(500).optional(),
  metaImagen: urlOVacio.optional(),
});

export const promocionActualizarSchema = promocionCrearSchema.partial();
