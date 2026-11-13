import "server-only";

// ── Validaciones ─────────────────────────────────────────────────────────────

export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 200;
}

export function validarPassword(password: string): {
  valida: boolean;
  mensaje?: string;
} {
  if (password.length < 8)
    return { valida: false, mensaje: "La contraseña debe tener al menos 8 caracteres" };
  if (password.length > 200)
    return { valida: false, mensaje: "Contraseña demasiado larga" };
  if (!/[A-Z]/.test(password))
    return { valida: false, mensaje: "Debe tener al menos una mayúscula" };
  if (!/[0-9]/.test(password))
    return { valida: false, mensaje: "Debe tener al menos un número" };
  return { valida: true };
}

export function validarNombre(nombre: string): boolean {
  return nombre.trim().length >= 2 && nombre.trim().length <= 100;
}
