import "server-only";
// TEMPORAL: se elimina en la fase 07.

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

// ── Rate limiting para REENVÍO de verificación — evita email bombing ─────────
// Clave por EMAIL (no por IP), porque un atacante puede rotar IPs pero
// el email de la víctima siempre es el mismo.

class ResendVerificationLimiter {
  private intentos: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly MAX_REENVIOS = 3;          // máx 3 reenvíos por email por hora
  private readonly VENTANA = 60 * 60 * 1000; // 1 hora

  constructor() {
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.limpiar(), 10 * 60 * 1000);
    }
  }

  puedeReenviar(email: string): { permitido: boolean; tiempoRestante?: number } {
    const now = Date.now();
    const actual = this.intentos.get(email);

    if (!actual || now - actual.lastAttempt > this.VENTANA) {
      this.intentos.set(email, { count: 1, lastAttempt: now });
      return { permitido: true };
    }

    if (actual.count >= this.MAX_REENVIOS) {
      const tiempoRestante = Math.ceil((this.VENTANA - (now - actual.lastAttempt)) / 1000 / 60);
      return { permitido: false, tiempoRestante };
    }

    this.intentos.set(email, { count: actual.count + 1, lastAttempt: actual.lastAttempt });
    return { permitido: true };
  }

  private limpiar(): void {
    const now = Date.now();
    for (const [key, intento] of this.intentos.entries()) {
      if (now - intento.lastAttempt > this.VENTANA) {
        this.intentos.delete(key);
      }
    }
  }
}

export const resendVerificationLimiter = new ResendVerificationLimiter();

// ── Login admin (traído de lib/loginAttempts.ts) ─────────────────────────────

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class LoginAttemptTracker {
  private attempts: Map<string, LoginAttempt>;
  private readonly MAX_ATTEMPTS = 3;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
  private readonly RESET_TIME = 60 * 60 * 1000;     // 1 hora
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000;

  constructor() {
    this.attempts = new Map();
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now - attempt.lastAttempt > this.RESET_TIME) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return;
    }

    const newCount = attempt.count + 1;
    this.attempts.set(identifier, {
      count: newCount,
      lastAttempt: now,
      blockedUntil: newCount >= this.MAX_ATTEMPTS ? now + this.BLOCK_DURATION : undefined,
    });
  }

  isBlocked(identifier: string): { blocked: boolean; remainingTime?: number } {
    const attempt = this.attempts.get(identifier);
    if (!attempt?.blockedUntil) return { blocked: false };

    const now = Date.now();
    if (now < attempt.blockedUntil) {
      const remainingTime = Math.ceil((attempt.blockedUntil - now) / 1000 / 60);
      return { blocked: true, remainingTime };
    }

    this.attempts.delete(identifier);
    return { blocked: false };
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return this.MAX_ATTEMPTS;
    return Math.max(0, this.MAX_ATTEMPTS - attempt.count);
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (
        now - attempt.lastAttempt > this.RESET_TIME ||
        (attempt.blockedUntil && now > attempt.blockedUntil)
      ) {
        this.attempts.delete(key);
      }
    }
  }

  getStats() {
    return {
      tracked: this.attempts.size,
      blocked: Array.from(this.attempts.values()).filter(
        (a) => a.blockedUntil && Date.now() < a.blockedUntil
      ).length,
    };
  }
}

export const loginTracker = new LoginAttemptTracker();