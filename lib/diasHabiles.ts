// Días hábiles para el plazo del Libro de Reclamaciones (fase 22b, D-81).
// Solo sábados y domingos cuentan como no hábiles: los feriados no se descuentan, así la fecha que se
// muestra nunca es más permisiva que el plazo real. Se calcula en hora de Lima (UTC−5 fijo, sin horario de verano).

const DESFASE_LIMA_MS = -5 * 3_600_000;
const DIA_MS = 86_400_000;

/** Día calendario de Lima como número de días desde 1970-01-01 (UTC). */
function diaLima(fecha: Date): number {
  return Math.floor((fecha.getTime() + DESFASE_LIMA_MS) / DIA_MS);
}

function esHabil(dia: number): boolean {
  const semana = new Date(dia * DIA_MS).getUTCDay(); // 0 domingo … 6 sábado
  return semana !== 0 && semana !== 6;
}

/** Último instante (23:59:59.999 en Lima) del día indicado. */
function finDelDia(dia: number): Date {
  return new Date((dia + 1) * DIA_MS - DESFASE_LIMA_MS - 1);
}

/**
 * Suma `n` días hábiles a `fecha`, empezando a contar el día siguiente (en Lima).
 * Devuelve el final de ese día en hora de Lima. Viernes + 1 = lunes.
 */
export function sumarDiasHabiles(fecha: Date, n: number): Date {
  if (!Number.isInteger(n) || n < 0) throw new Error("n debe ser un entero no negativo");
  let dia = diaLima(fecha);
  let contados = 0;
  while (contados < n) {
    dia += 1;
    if (esHabil(dia)) contados += 1;
  }
  return finDelDia(dia);
}

/** Días hábiles en el intervalo (desde, hasta], contados por día de Lima. */
function habilesEntre(desde: number, hasta: number): number {
  let total = 0;
  for (let d = desde + 1; d <= hasta; d++) if (esHabil(d)) total += 1;
  return total;
}

/**
 * Días hábiles que quedan hasta `fechaLimite`.
 * - 0: vence hoy (aún no pasó la hora límite).
 * - positivo: días hábiles que faltan.
 * - negativo: vencido; cuántos días hábiles han pasado (como mínimo −1).
 */
export function diasHabilesRestantes(fechaLimite: Date, ahora: Date = new Date()): number {
  const hoy = diaLima(ahora);
  const limite = diaLima(fechaLimite);
  if (ahora.getTime() > fechaLimite.getTime()) return -Math.max(1, habilesEntre(limite, hoy));
  return habilesEntre(hoy, limite);
}
