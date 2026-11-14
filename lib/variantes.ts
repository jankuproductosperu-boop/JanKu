import type { ProductoOpcion, ProductoVariante } from "@/types";

// Funciones puras de variantes (fase 13b, D-60 a D-66). Seguras en navegador y servidor.

export const MAX_OPCIONES = 3;
export const MAX_VALORES = 20;
export const MAX_VARIANTES = 100;

/** "Tiene variantes" = el arreglo existe y tiene al menos un elemento. */
export function tieneVariantes(p: { variantes?: unknown[] | null }): boolean {
  return Array.isArray(p.variantes) && p.variantes.length > 0;
}

/** "Color: Negro · Talla: M". Sigue el orden de `orden` (nombres de opciones); el resto va al final. */
export function etiquetaVariante(combinacion: Record<string, string>, orden?: string[]): string {
  const claves = Object.keys(combinacion);
  const ordenadas = orden ? [...orden.filter((k) => claves.includes(k)), ...claves.filter((k) => !orden.includes(k))] : claves;
  return ordenadas.map((k) => `${k}: ${combinacion[k]}`).join(" · ");
}

/** Producto cartesiano en orden estable (primera opción como la más lenta). Sin opciones → []. */
export function combinaciones(opciones: ProductoOpcion[]): Record<string, string>[] {
  if (opciones.length === 0) return [];
  let resultado: Record<string, string>[] = [{}];
  for (const op of opciones) {
    const siguiente: Record<string, string>[] = [];
    for (const parcial of resultado) {
      for (const valor of op.valores) siguiente.push({ ...parcial, [op.nombre]: valor });
    }
    resultado = siguiente;
  }
  return resultado;
}

/** Clave estable de una combinación según el orden de las opciones (para detectar repetidas). */
export function claveCombinacion(combinacion: Record<string, string>, opciones: ProductoOpcion[]): string {
  return opciones.map((o) => `${o.nombre}=${combinacion[o.nombre] ?? ""}`).join("|");
}

const normal = (s: string) => s.trim().toLowerCase();

/** Valida opciones y variantes juntas. Devuelve un mensaje para mostrar, o null si todo está bien. */
export function validarVariantes(
  opciones: ProductoOpcion[],
  variantes: Pick<ProductoVariante, "combinacion">[],
): string | null {
  if (variantes.length === 0) return opciones.length === 0 ? null : "Agrega al menos una variante";
  if (opciones.length === 0) return "Define al menos una opción (por ejemplo, Color)";
  if (opciones.length > MAX_OPCIONES) return `Máximo ${MAX_OPCIONES} opciones`;
  if (variantes.length > MAX_VARIANTES) return `Máximo ${MAX_VARIANTES} variantes`;

  const nombres = new Set<string>();
  for (const op of opciones) {
    if (!op.nombre.trim()) return "Cada opción necesita un nombre";
    if (nombres.has(normal(op.nombre))) return `La opción «${op.nombre}» está repetida`;
    nombres.add(normal(op.nombre));
    if (op.valores.length === 0) return `La opción «${op.nombre}» no tiene valores`;
    if (op.valores.length > MAX_VALORES) return `La opción «${op.nombre}» tiene más de ${MAX_VALORES} valores`;
    const valores = new Set<string>();
    for (const v of op.valores) {
      if (!v.trim()) return `La opción «${op.nombre}» tiene un valor vacío`;
      if (valores.has(normal(v))) return `El valor «${v}» está repetido en «${op.nombre}»`;
      valores.add(normal(v));
    }
  }

  const vistas = new Set<string>();
  for (const variante of variantes) {
    const claves = Object.keys(variante.combinacion);
    for (const op of opciones) {
      const valor = variante.combinacion[op.nombre];
      if (valor === undefined) return `Una variante no indica «${op.nombre}»`;
      if (!op.valores.includes(valor)) return `El valor «${valor}» no existe en «${op.nombre}»`;
    }
    const sobra = claves.find((k) => !opciones.some((o) => o.nombre === k));
    if (sobra) return `La opción «${sobra}» no está definida`;
    const clave = claveCombinacion(variante.combinacion, opciones);
    if (vistas.has(clave)) return `La combinación «${etiquetaVariante(variante.combinacion, opciones.map((o) => o.nombre))}» está repetida`;
    vistas.add(clave);
  }
  return null;
}

/** Suma del stock de las variantes ACTIVAS (el stock del producto con variantes, D-61). */
export function stockTotal(variantes: Pick<ProductoVariante, "stockCantidad" | "activo">[]): number {
  return variantes.reduce((suma, v) => (v.activo === false ? suma : suma + (v.stockCantidad ?? 0)), 0);
}

/** Precio de la variante; si no tiene propio, hereda el del producto (D-62). */
export function precioDeVariante(precioProducto: number, v?: { precio?: number | null }): number {
  return typeof v?.precio === "number" ? v.precio : precioProducto;
}

/** Precio mínimo entre las variantes activas y si hay precios distintos («Desde S/ …»). */
export function precioDesde(p: {
  precio: number;
  variantes?: { precio?: number | null; activo?: boolean }[];
}): { precio: number; varia: boolean } {
  const activas = (p.variantes ?? []).filter((v) => v.activo !== false);
  if (activas.length === 0) return { precio: p.precio, varia: false };
  const precios = activas.map((v) => precioDeVariante(p.precio, v));
  const minimo = Math.min(...precios);
  return { precio: minimo, varia: precios.some((x) => x !== minimo) };
}

/** Identificador de la línea del carrito (D-63). Sin variante = el id del producto, como siempre. */
export function lineaId(productoId: string, varianteId?: string): string {
  return varianteId ? `${productoId}:${varianteId}` : productoId;
}
