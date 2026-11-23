// Mapa de visitas de Estadísticas (fase 23d, D-94). Funciones puras: unir los nombres de región que da
// Google Analytics con las formas del mapa, escalones de color por cuantiles y tamaño de los marcadores.

/**
 * Nombre normalizado → código ISO 3166-2 del departamento (los `id` de `peru.json`).
 * Google escribe los nombres en inglés y sin tildes («Junin», «Lima Region»); Natural Earth, en español.
 * Q4 (D-94): «Lima» sola es Lima Metropolitana (PE-LMA); «Lima Region» son las provincias de Lima (PE-LIM).
 */
const ALIAS_PERU: Record<string, string> = {
  amazonas: "PE-AMA",
  ancash: "PE-ANC",
  apurimac: "PE-APU",
  arequipa: "PE-ARE",
  ayacucho: "PE-AYA",
  cajamarca: "PE-CAJ",
  callao: "PE-CAL",
  "el callao": "PE-CAL",
  cusco: "PE-CUS",
  cuzco: "PE-CUS",
  huancavelica: "PE-HUV",
  huanuco: "PE-HUC",
  ica: "PE-ICA",
  junin: "PE-JUN",
  "la libertad": "PE-LAL",
  lambayeque: "PE-LAM",
  lima: "PE-LMA",
  "lima region": "PE-LIM",
  "region lima": "PE-LIM",
  "lima provincias": "PE-LIM",
  loreto: "PE-LOR",
  "madre de dios": "PE-MDD",
  moquegua: "PE-MOQ",
  pasco: "PE-PAS",
  piura: "PE-PIU",
  puno: "PE-PUN",
  "san martin": "PE-SAM",
  tacna: "PE-TAC",
  tumbes: "PE-TUM",
  ucayali: "PE-UCA",
};

/** Los 26 códigos del mapa del Perú (24 departamentos, el Callao y Lima Metropolitana). */
export const IDS_PERU: readonly string[] = [...new Set(Object.values(ALIAS_PERU))].sort();

/** Palabras que no distinguen una región de otra («Callao Region», «Department of Cusco»). */
const GENERICAS = new Set([
  "region",
  "departamento",
  "department",
  "provincia",
  "province",
  "constitucional",
  "constitutional",
  "municipalidad",
  "municipality",
  "metropolitana",
  "metropolitan",
  "gobierno",
  "regional",
]);
/** Conectores que sobran al principio o al final tras quitar las palabras genéricas. */
const CONECTORES = new Set(["de", "del", "of", "the"]);

/** Minúsculas, sin tildes ni signos, con un solo espacio entre palabras. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Código del departamento para un nombre de región de Google, o `null` si no se puede ubicar. */
export function idDeRegionPeru(nombre: string): string | null {
  const completo = normalizarNombre(nombre);
  if (!completo) return null;
  if (ALIAS_PERU[completo]) return ALIAS_PERU[completo];
  const palabras = completo.split(" ").filter((p) => !GENERICAS.has(p));
  while (palabras.length && CONECTORES.has(palabras[0])) palabras.shift();
  while (palabras.length && CONECTORES.has(palabras[palabras.length - 1])) palabras.pop();
  return ALIAS_PERU[palabras.join(" ")] ?? null;
}

export type Ubicacion = {
  /** Usuarios por `id` del mapa (las claves que caen en la misma forma se suman). */
  porId: Record<string, number>;
  /** Lo que no se pudo poner en el mapa, con sus usuarios, de más a menos (R5: los totales cuadran). */
  sinUbicar: { clave: string; usuarios: number }[];
};

/**
 * Reparte las filas de Google entre las formas del mapa. `idDe` traduce la clave de Google (nombre de
 * región o código de país) al `id` de la forma; si no hay traducción o la forma no está en el mapa,
 * la fila va a `sinUbicar`. Las filas sin usuarios se ignoran.
 */
export function ubicarEnMapa(
  filas: readonly { clave: string; usuarios: number }[],
  idDe: (clave: string) => string | null,
  idsDelMapa: ReadonlySet<string>,
): Ubicacion {
  const porId: Record<string, number> = {};
  const fuera = new Map<string, number>();
  for (const { clave, usuarios } of filas) {
    if (!(usuarios > 0)) continue;
    const id = idDe(clave);
    if (id && idsDelMapa.has(id)) porId[id] = (porId[id] ?? 0) + usuarios;
    else fuera.set(clave, (fuera.get(clave) ?? 0) + usuarios);
  }
  const sinUbicar = [...fuera.entries()]
    .map(([clave, usuarios]) => ({ clave, usuarios }))
    .sort((a, b) => b.usuarios - a.usuarios);
  return { porId, sinUbicar };
}

/**
 * Escala de color por cuantiles: devuelve una función que da el escalón 1…`pasos` según la posición del
 * valor entre los valores con visitas (el mayor siempre tiene el más fuerte), y 0 si no hay visitas.
 */
export function escalaDeColor(valores: readonly number[], pasos = 5): (valor: number) => number {
  const orden = valores.filter((v) => v > 0).sort((a, b) => a - b);
  return (valor) => {
    if (!(valor > 0) || !orden.length) return 0;
    // Cuántos valores son menores o iguales (búsqueda binaria del último ≤ valor).
    let bajo = 0;
    let alto = orden.length;
    while (bajo < alto) {
      const medio = (bajo + alto) >> 1;
      if (orden[medio] <= valor) bajo = medio + 1;
      else alto = medio;
    }
    return Math.min(pasos, Math.max(1, Math.ceil((pasos * bajo) / orden.length)));
  };
}

/**
 * Radio del marcador: crece con la raíz de los usuarios (el área es proporcional), entre `minimo` y
 * `maximo`. 0 si no hay usuarios.
 */
export function radioMarcador(valor: number, mayor: number, minimo = 4, maximo = 12): number {
  if (!(valor > 0)) return 0;
  if (!(mayor > 0)) return minimo;
  const parte = Math.min(1, valor / mayor);
  return Math.round((minimo + (maximo - minimo) * Math.sqrt(parte)) * 10) / 10;
}
