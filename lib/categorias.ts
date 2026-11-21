// Subcategorías (fase 25, D-88). Un solo nivel: una categoría puede tener una madre (`padre`, slug)
// y una hija no puede tener hijas. Funciones puras, las mismas en el navegador y en el servidor.

type CategoriaMin = { slug: string; nombre?: string; activo?: boolean; orden?: number; padre?: string };

/** Slug de la madre o null. "" y espacios cuentan como "sin madre". */
export function madreDe(c: Pick<CategoriaMin, "padre">): string | null {
  const p = c.padre?.trim();
  return p ? p : null;
}

/** Subcategorías ACTIVAS de una madre, por orden y luego por nombre. */
export function hijasDe<T extends CategoriaMin>(slug: string, categorias: T[]): T[] {
  return categorias
    .filter((c) => c.activo !== false && madreDe(c) === slug && c.slug !== slug)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.nombre ?? "").localeCompare(b.nombre ?? ""));
}

/** La categoría y sus hijas activas: lo que reúne la página de la madre (Q3). */
export function slugsDeCategoria(slug: string, categorias: CategoriaMin[]): string[] {
  return [slug, ...hijasDe(slug, categorias).map((c) => c.slug)];
}

/** Las que salen en el menú: las que no son hijas de otra. */
export function categoriasPrincipales<T extends CategoriaMin>(categorias: T[]): T[] {
  return categorias.filter((c) => madreDe(c) === null);
}

export type ErrorMadre = "NO_EXISTE" | "ELLA_MISMA" | "MADRE_ES_HIJA" | "TIENE_HIJAS";

/**
 * ¿Puede `slug` tener como madre a `padre`? null si sí (o si no tiene madre).
 * `slug` es null al crear (todavía no tiene slug ni hijas).
 */
export function validarMadre(slug: string | null, padre: string | undefined, categorias: CategoriaMin[]): ErrorMadre | null {
  const p = padre?.trim();
  if (!p) return null;
  if (slug !== null && p === slug) return "ELLA_MISMA";
  const madre = categorias.find((c) => c.slug === p);
  if (!madre) return "NO_EXISTE";
  if (madreDe(madre) !== null) return "MADRE_ES_HIJA";
  if (slug !== null && categorias.some((c) => c.slug !== slug && madreDe(c) === slug)) return "TIENE_HIJAS";
  return null;
}
