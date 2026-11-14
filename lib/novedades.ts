// "Novedad de la semana": un producto es novedad mientras `nuevoHasta` sea una fecha futura.
// Se calcula al consultar; no hay tareas programadas (D-58).

export const DIAS_NOVEDAD = 7;
const MS_DIA = 24 * 60 * 60 * 1000;

export function esNovedad(p: { nuevoHasta?: string | null }, ahora: number = Date.now()): boolean {
  if (!p.nuevoHasta) return false;
  const hasta = Date.parse(p.nuevoHasta);
  return Number.isFinite(hasta) && hasta > ahora;
}

/** Fecha ISO (UTC) en la que deja de ser novedad, a `dias` días desde `ahora`. */
export function fechaNuevoHasta(ahora: number = Date.now(), dias: number = DIAS_NOVEDAD): string {
  return new Date(ahora + dias * MS_DIA).toISOString();
}
