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