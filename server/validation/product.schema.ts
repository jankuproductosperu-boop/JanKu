import "server-only";
import { z } from "zod";
import {
  dinero,
  enteroNoNegativo,
  listaTexto,
  objectId,
  texto,
  textoRequerido,
  urlOVacio,
} from "@/server/validation/common";

export const productoCrearSchema = z.object({
  nombre: textoRequerido(200),
  precio: dinero,
  descripcion: texto(2000).optional(),
  descripcionCompleta: texto(20000).optional(),
  categorias: listaTexto(20, 100).optional(),
  categoriaSlugs: listaTexto(20, 100).optional(),
  stock: z.enum(["Disponible", "Limitado", "Agotado"]).optional(), // se retira en la fase 13
  imagenes: listaTexto(10, 300).optional(),
  imagenPrincipal: texto(300).optional(),
  imagenUrl: urlOVacio.optional(),
  imagenesAdicionales: z.array(urlOVacio).max(10).optional(),
  videoUrl: urlOVacio.optional(),
  deliveryHuancayo: z.boolean().optional(),
  mostrarEnHome: z.boolean().optional(),
  nuevoHasta: z.iso.datetime().nullable().optional(),
  envioGratis: z.boolean().optional(),
  whatsappLink: urlOVacio.optional(),
  whatsappNumero: texto(20).optional(),
  caracteristicas: listaTexto(50, 500).optional(),
  garantia: texto(500).optional(),
  tags: listaTexto(30, 50).optional(),
  metaTitulo: texto(200).optional(),
  metaDescripcion: texto(500).optional(),
  metaImagen: urlOVacio.optional(),
  codigo: texto(50).optional(),
  precioCosto: dinero.optional(),
  stockCantidad: enteroNoNegativo.optional(),
  stockMinimo: enteroNoNegativo.optional(),
  proveedor: texto(200).optional(),
  activo: z.boolean().optional(),
});

export const productoActualizarSchema = productoCrearSchema.partial();

export const reordenarSchema = z.object({
  context: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  orden: z
    .array(z.object({ id: objectId, orden: z.coerce.number().int().min(0).max(100000) }))
    .min(1)
    .max(1000),
});
