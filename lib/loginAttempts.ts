// lib/loginAttempts.ts
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class LoginAttemptTracker {
  private attempts: Map<string, LoginAttempt>;
  private readonly MAX_ATTEMPTS = 3;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
  private readonly RESET_TIME = 60 * 60 * 1000; // 1 hora

  constructor() {
    this.attempts = new Map();
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
      });
      return;
    }

    // Resetear si pasó el tiempo de reset
    if (now - attempt.lastAttempt > this.RESET_TIME) {
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
      });
      return;
    }

    // Incrementar contador
    this.attempts.set(identifier, {
      count: attempt.count + 1,
      lastAttempt: now,
      blockedUntil: attempt.count + 1 >= this.MAX_ATTEMPTS 
        ? now + this.BLOCK_DURATION 
        : undefined,
    });
  }

  isBlocked(identifier: string): { blocked: boolean; remainingTime?: number } {
    const attempt = this.attempts.get(identifier);
    
    if (!attempt || !attempt.blockedUntil) {
      return { blocked: false };
    }

    const now = Date.now();
    
    if (now < attempt.blockedUntil) {
      const remainingTime = Math.ceil((attempt.blockedUntil - now) / 1000 / 60);
      return { blocked: true, remainingTime };
    }

    // El bloqueo expiró, resetear
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
}

export const loginTracker = new LoginAttemptTracker();