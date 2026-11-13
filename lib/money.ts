export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatearSoles(n: number): string {
  return `S/ ${redondear2(n).toFixed(2)}`;
}
