import crypto from "crypto";

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

// ── Tokens seguros ───────────────────────────────────────────────────────────

/** Genera un token hexadecimal de 64 bytes — imposible de adivinar */
export function generarToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/** Hashea el token antes de guardarlo en MongoDB — así aunque hackeen la BD los tokens son inútiles */
export function hashearToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ── Rate limiting en memoria (capa rápida) ───────────────────────────────────

interface Intento {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class UserRateLimiter {
  private intentos: Map<string, Intento> = new Map();
  private readonly MAX_INTENTOS = 5;           // más permisivo que el admin
  private readonly BLOQUEO = 15 * 60 * 1000;  // 15 minutos
  private readonly RESET = 60 * 60 * 1000;    // 1 hora

  constructor() {
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.limpiar(), 10 * 60 * 1000);
    }
  }

  registrarIntento(id: string): void {
    const now = Date.now();
    const actual = this.intentos.get(id);
    if (!actual || now - actual.lastAttempt > this.RESET) {
      this.intentos.set(id, { count: 1, lastAttempt: now });
      return;
    }
    const nuevo = actual.count + 1;
    this.intentos.set(id, {
      count: nuevo,
      lastAttempt: now,
      blockedUntil: nuevo >= this.MAX_INTENTOS ? now + this.BLOQUEO : undefined,
    });
  }

  estaBloqueado(id: string): { bloqueado: boolean; tiempoRestante?: number } {
    const actual = this.intentos.get(id);
    if (!actual?.blockedUntil) return { bloqueado: false };
    const now = Date.now();
    if (now < actual.blockedUntil) {
      return {
        bloqueado: true,
        tiempoRestante: Math.ceil((actual.blockedUntil - now) / 1000 / 60),
      };
    }
    this.intentos.delete(id);
    return { bloqueado: false };
  }

  intentosRestantes(id: string): number {
    const actual = this.intentos.get(id);
    if (!actual) return this.MAX_INTENTOS;
    return Math.max(0, this.MAX_INTENTOS - actual.count);
  }

  resetear(id: string): void {
    this.intentos.delete(id);
  }

  private limpiar(): void {
    const now = Date.now();
    for (const [key, intento] of this.intentos.entries()) {
      if (
        now - intento.lastAttempt > this.RESET ||
        (intento.blockedUntil && now > intento.blockedUntil)
      ) {
        this.intentos.delete(key);
      }
    }
  }
}

export const userRateLimiter = new UserRateLimiter();

// ── Rate limiting para registro — evita spam de cuentas ──────────────────────

class RegisterRateLimiter {
  private intentos: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly MAX_REGISTROS = 3;          // máx 3 registros por IP por hora
  private readonly VENTANA = 60 * 60 * 1000;  // 1 hora

  puedeRegistrar(ip: string): boolean {
    const now = Date.now();
    const actual = this.intentos.get(ip);
    if (!actual || now - actual.lastAttempt > this.VENTANA) {
      this.intentos.set(ip, { count: 1, lastAttempt: now });
      return true;
    }
    if (actual.count >= this.MAX_REGISTROS) return false;
    this.intentos.set(ip, { count: actual.count + 1, lastAttempt: actual.lastAttempt });
    return true;
  }
}

export const registerRateLimiter = new RegisterRateLimiter();

// ── Headers de seguridad ─────────────────────────────────────────────────────

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

// ── Obtener IP del cliente ────────────────────────────────────────────────────

export function obtenerIP(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45);
}