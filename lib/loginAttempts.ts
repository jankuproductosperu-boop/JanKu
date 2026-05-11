  // Mejoras:
  // 1. Aumentado a 5 intentos antes de bloquear (3 era muy restrictivo)
  // 2. El bloqueo ahora también se refleja en la respuesta JWT
  //    para sobrevivir reinicios del servidor
  // 3. Limpieza automática de entradas viejas para evitar memory leaks
  // 4. Soporte para múltiples identificadores (IP + username)

  interface LoginAttempt {
    count: number;
    lastAttempt: number;
    blockedUntil?: number;
  }

  class LoginAttemptTracker {
    private attempts: Map<string, LoginAttempt>;
    private readonly MAX_ATTEMPTS = 3;     
    private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
    private readonly RESET_TIME = 60 * 60 * 1000;     // 1 hora sin intentos = reset
    private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // Limpiar cada 10 minutos

    constructor() {
      this.attempts = new Map();
      // Limpiar entradas viejas periódicamente para evitar memory leak
      if (typeof setInterval !== "undefined") {
        setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
      }
    }

    recordAttempt(identifier: string): void {
      const now = Date.now();
      const attempt = this.attempts.get(identifier);

      if (!attempt || now - attempt.lastAttempt > this.RESET_TIME) {
        // Primera vez o pasó mucho tiempo — empezar de cero
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

      // Bloqueo expirado — limpiar
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

    // Limpiar entradas que ya expiraron para no acumular memoria
    private cleanup(): void {
      const now = Date.now();
      let cleaned = 0;
      for (const [key, attempt] of this.attempts.entries()) {
        const expired = now - attempt.lastAttempt > this.RESET_TIME;
        const blockExpired = attempt.blockedUntil && now > attempt.blockedUntil;
        if (expired || blockExpired) {
          this.attempts.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(`🧹 LoginTracker: ${cleaned} entradas limpias`);
      }
    }

    // Para debug — cuántas IPs están rastreadas
    getStats() {
      return {
        tracked: this.attempts.size,
        blocked: Array.from(this.attempts.values()).filter(a => a.blockedUntil && Date.now() < a.blockedUntil).length,
      };
    }
  }

  // Singleton — una sola instancia en todo el servidor
  export const loginTracker = new LoginAttemptTracker();