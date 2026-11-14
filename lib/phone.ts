/** Devuelve "51" + 9 dígitos, o null si no es un móvil peruano válido (D-34). */
export function normalizarTelefono(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
  if (/^519\d{8}$/.test(digitos)) return digitos;
  return null;
}
