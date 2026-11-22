// Fase 27b (D-92): pide a Cloudinary cada imagen al ancho en que se muestra.
// Solo toca URL de la forma https://res.cloudinary.com/<nube>/image/upload/...; el resto vuelve igual.
// No se usa en ProductCard ni en el panel: sus generadores de URL siguen aparte (CLAUDE.md §7).

const PREFIJO = /^(https:\/\/res\.cloudinary\.com\/[^/?#]+\/image\/upload\/)(.+)$/;

// Claves de transformación de Cloudinary (las que puede llevar un tramo como "f_auto,q_auto,w_400").
// Con la lista se distingue un tramo de transformación de una carpeta con guion bajo ("en_oferta/…").
const CLAVES = new Set([
  "a", "ac", "af", "ar", "b", "bo", "br", "c", "co", "cs", "d", "dl", "dn", "dpr", "du", "e", "eo",
  "f", "fl", "fn", "fps", "g", "h", "ki", "l", "o", "p", "pg", "q", "r", "so", "sp", "t", "u", "vc",
  "vs", "w", "x", "y", "z",
]);

function esTransformacion(tramo: string): boolean {
  if (!tramo) return false;
  return tramo.split(",").every((parte) => {
    const i = parte.indexOf("_");
    return i > 0 && i < parte.length - 1 && CLAVES.has(parte.slice(0, i));
  });
}

/**
 * Devuelve la URL de Cloudinary con `w_<ancho>` y, si faltan, `f_auto`, `q_auto` y `c_limit`
 * (este último evita que Cloudinary agrande una imagen más pequeña que el ancho pedido).
 * Si la URL ya trae transformaciones en su primer tramo, se completan ahí (un `w_` previo se cambia);
 * si no, se añade un tramo nuevo antes de la versión (`v123/`) o del nombre.
 * URL vacías, de otros sitios o con un ancho no válido vuelven sin cambios.
 */
export function imagenCloudinary(url: string, ancho: number): string {
  if (!url || !Number.isFinite(ancho) || ancho <= 0) return url;
  const m = PREFIJO.exec(url);
  if (!m) return url;
  const [, base, resto] = m;
  const w = `w_${Math.ceil(ancho)}`;

  const barra = resto.indexOf("/");
  const primero = barra === -1 ? resto : resto.slice(0, barra);
  if (barra !== -1 && esTransformacion(primero)) {
    const partes = primero.split(",");
    const conAncho = partes.some((p) => p.startsWith("w_"))
      ? partes.map((p) => (p.startsWith("w_") ? w : p))
      : [...partes, w];
    const tiene = (clave: string) => conAncho.some((p) => p.startsWith(`${clave}_`));
    const faltan = [
      tiene("f") ? null : "f_auto",
      tiene("q") ? null : "q_auto",
      tiene("c") ? null : "c_limit",
    ].filter((p): p is string => p !== null);
    return `${base}${[...conAncho, ...faltan].join(",")}${resto.slice(barra)}`;
  }
  return `${base}f_auto,q_auto,${w},c_limit/${resto}`;
}

/**
 * `srcSet` para una `<img>`: la misma imagen a cada ancho ("url 420w, url 840w").
 * Devuelve `undefined` si la URL no es de Cloudinary, para que la `<img>` use solo `src`.
 */
export function srcSetCloudinary(url: string, anchos: readonly number[]): string | undefined {
  if (!url || !PREFIJO.test(url)) return undefined;
  const validos = [...new Set(anchos.filter((a) => Number.isFinite(a) && a > 0).map((a) => Math.ceil(a)))]
    .sort((a, b) => a - b);
  if (validos.length === 0) return undefined;
  return validos.map((a) => `${imagenCloudinary(url, a)} ${a}w`).join(", ");
}
