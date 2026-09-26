/**
 * Genera un slug de texto simple, sin depender de lib/cloudinary.ts
 * (ese archivo importa el SDK de Cloudinary, que usa "fs" de Node y
 * no puede correr en el navegador — por eso esta copia local).
 */
function textoASlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Arma el link "híbrido" del producto: texto legible (para SEO) + código
 * corto derivado del _id de Mongo. El código NUNCA cambia, aunque edites
 * el nombre del producto después — por eso el link no se rompe.
 */
export function buildProductUrl(nombre: string, codigoUrl?: string): string {
  const texto = textoASlug(nombre || "producto");
  if (!codigoUrl) return texto; // producto viejo aún sin migrar — fallback
  return `${texto}-${codigoUrl}`;
}

/**
 * Extrae el código corto (lo que viene después del último guion) de un
 * slug tomado de la URL, para poder buscar el producto en MongoDB.
 */
export function extractCodigoUrl(slugParam: string): string {
  const partes = slugParam.split("-");
  return partes[partes.length - 1];
}