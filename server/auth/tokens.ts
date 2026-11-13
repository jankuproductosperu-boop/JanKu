import "server-only";
import crypto from "crypto";

/** Genera un token hexadecimal de 64 bytes — imposible de adivinar */
export function generarToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/** Hashea el token antes de guardarlo en MongoDB — así aunque hackeen la BD los tokens son inútiles */
export function hashearToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
