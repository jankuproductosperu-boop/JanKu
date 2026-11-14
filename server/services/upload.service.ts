import "server-only";
import sharp, { type Metadata } from "sharp";
import {
  deleteFromCloudinary,
  generateBannerPublicId,
  generatePromocionPublicId,
  generatePublicId,
  generateSlug,
  uploadToCloudinary,
} from "@/server/cloudinary";
import { entradaInvalida, prohibido } from "@/server/http/errors";
import { log } from "@/server/logger";

type Formato = "jpeg" | "png" | "webp" | "avif";

const FORMATOS_PERMITIDOS: readonly string[] = ["jpeg", "png", "webp", "avif"];
const LADO_MAXIMO = 2000;
const MAX_BYTES = 5 * 1024 * 1024;
const PATRON_PUBLIC_ID = /^(productos|banners|promociones)\/[a-z0-9/_-]+$/;

export type ImagenSubida = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  index: number;
};

/**
 * Comprueba el contenido real del archivo (no el tipo que declara el navegador).
 * Si cabe en 2000×2000 devuelve el mismo buffer, sin recodificar.
 */
export async function prepararImagen(buffer: Buffer): Promise<{ buffer: Buffer; formato: Formato }> {
  const img = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 });

  let meta: Metadata;
  try {
    meta = await img.metadata();
  } catch {
    throw entradaInvalida({ images: "El archivo no es una imagen válida" }, "El archivo no es una imagen válida");
  }

  // sharp informa los AVIF como "heif" con compresión "av1"; HEIC (hevc) no se admite.
  const formato = meta.format === "heif" && meta.compression === "av1" ? "avif" : meta.format;
  if (!formato || !FORMATOS_PERMITIDOS.includes(formato)) {
    const mensaje = "Formato no permitido. Usa JPG, PNG, WebP o AVIF";
    throw entradaInvalida({ images: mensaje }, mensaje);
  }

  const ancho = meta.width ?? 0;
  const alto = meta.height ?? 0;
  if (ancho > LADO_MAXIMO || alto > LADO_MAXIMO) {
    try {
      const reducida = await img
        .rotate()
        .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
        .toBuffer();
      return { buffer: reducida, formato: formato as Formato };
    } catch {
      throw entradaInvalida({ images: "El archivo no es una imagen válida" }, "El archivo no es una imagen válida");
    }
  }

  return { buffer, formato: formato as Formato };
}

export async function subirImagenes(args: {
  archivos: File[];
  entidad: "producto" | "banner" | "promocion";
  producto?: { nombre: string; categoriaSlug: string; tags: string[]; existentes: number };
  banner?: { nombre: string; subcarpeta: "home" | "categorias" | "campanas" };
  promocion?: { nombre: string; subcarpeta: "ofertas" | "combos" | "publicidad" };
}): Promise<ImagenSubida[]> {
  const { archivos, entidad } = args;

  if (archivos.length === 0) {
    throw entradaInvalida({ images: "No se recibieron imágenes" }, "No se recibieron imágenes");
  }
  const maximo = entidad === "producto" ? 10 : 1;
  if (archivos.length > maximo) {
    const mensaje = `Máximo ${maximo} imagen(es) para ${entidad}`;
    throw entradaInvalida({ images: mensaje }, mensaje);
  }

  // Se valida todo antes de subir nada, para no dejar subidas a medias.
  const preparadas: Buffer[] = [];
  for (const archivo of archivos) {
    if (!archivo.type.startsWith("image/")) {
      const mensaje = `El archivo ${archivo.name} no es una imagen válida`;
      throw entradaInvalida({ images: mensaje }, mensaje);
    }
    if (archivo.size > MAX_BYTES) {
      const mensaje = `${archivo.name} supera el límite de 5MB`;
      throw entradaInvalida({ images: mensaje }, mensaje);
    }
    const original = Buffer.from(await archivo.arrayBuffer());
    preparadas.push((await prepararImagen(original)).buffer);
  }

  const tags = [...(args.producto?.tags ?? [])];
  const categoria = generateSlug(args.producto?.categoriaSlug || "general");
  const productoSlug = generateSlug(args.producto?.nombre || "producto");
  if (entidad === "producto") tags.push(categoria, productoSlug);

  const resultados = await Promise.all(
    preparadas.map(async (buffer, index) => {
      let publicId: string;
      if (entidad === "banner") {
        publicId = generateBannerPublicId(args.banner?.subcarpeta ?? "home", args.banner?.nombre ?? "");
      } else if (entidad === "promocion") {
        publicId = generatePromocionPublicId(args.promocion?.subcarpeta ?? "ofertas", args.promocion?.nombre ?? "");
      } else {
        publicId = generatePublicId(categoria, productoSlug, (args.producto?.existentes ?? 0) + index);
      }

      const r = await uploadToCloudinary(buffer, publicId, { tags });
      return {
        public_id: r.public_id,
        secure_url: r.secure_url,
        width: r.width,
        height: r.height,
        bytes: r.bytes,
        index,
      };
    }),
  );

  log.info("imagenes_subidas", { entidad, cantidad: resultados.length });
  return resultados;
}

export async function eliminarImagen(publicId: string): Promise<void> {
  if (!PATRON_PUBLIC_ID.test(publicId) || publicId.includes("..")) {
    throw prohibido("public_id no permitido");
  }
  await deleteFromCloudinary(publicId);
}
