import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export const COOKIE_ADMIN = "admin-token";
export const COOKIE_USER = "user-token";

const DURACION_ADMIN_S = 60 * 60 * 8; // 8 horas
const DURACION_USER_S = 60 * 60 * 24 * 7; // 7 días
const ALG = "HS256"; // el mismo algoritmo con que se firmaban los tokens antes de la fase 08: siguen siendo válidos

function secreto(nombre: "JWT_SECRET" | "USER_JWT_SECRET"): Uint8Array {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return new TextEncoder().encode(valor);
}

// ── Firmar ───────────────────────────────────────────────────────────────────
// Se siguen escribiendo `userId` (y `v` en admin) además de `sub`/`tv` para que,
// si hay que revertir esta fase, el código anterior entienda los tokens nuevos.

export async function firmarAdmin(a: {
  id: string;
  username: string;
  email: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({ userId: a.id, username: a.username, email: a.email, tv: a.tokenVersion, typ: "admin", v: 1 })
    .setProtectedHeader({ alg: ALG })
    .setSubject(a.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_ADMIN_S}s`)
    .sign(secreto("JWT_SECRET"));
}

export async function firmarUser(u: {
  id: string;
  nombre: string;
  email: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({ userId: u.id, nombre: u.nombre, email: u.email, tv: u.tokenVersion, typ: "user" })
    .setProtectedHeader({ alg: ALG })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_USER_S}s`)
    .sign(secreto("USER_JWT_SECRET"));
}

// ── Verificar ────────────────────────────────────────────────────────────────

export type ClaimsAdmin = { id: string; tv: number };
export type ClaimsUser = { id: string; tv: number; nombre?: string; email?: string };

/** Compatibilidad: id = sub ?? userId ; tv = tv ?? 0. Devuelve null si el payload no sirve. */
function leerBase(payload: JWTPayload, typEsperado: "admin" | "user"): { id: string; tv: number } | null {
  // Tokens anteriores a esta fase no traen `typ`; si lo traen, debe coincidir.
  if (payload.typ !== undefined && payload.typ !== typEsperado) return null;
  const id = typeof payload.sub === "string" && payload.sub ? payload.sub : payload.userId;
  if (typeof id !== "string" || !id) return null;
  const tv = payload.tv === undefined ? 0 : payload.tv;
  if (typeof tv !== "number" || !Number.isInteger(tv)) return null;
  return { id, tv };
}

async function verificar(token: string, clave: Uint8Array): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, clave, { algorithms: [ALG] });
    return payload;
  } catch {
    return null; // firma inválida, expirado o malformado
  }
}

export async function verificarAdmin(token: string): Promise<ClaimsAdmin | null> {
  const payload = await verificar(token, secreto("JWT_SECRET"));
  return payload ? leerBase(payload, "admin") : null;
}

export async function verificarUser(token: string): Promise<ClaimsUser | null> {
  const payload = await verificar(token, secreto("USER_JWT_SECRET"));
  if (!payload) return null;
  const base = leerBase(payload, "user");
  if (!base) return null;
  return {
    ...base,
    nombre: typeof payload.nombre === "string" ? payload.nombre : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

// ── Cookies ──────────────────────────────────────────────────────────────────
// Mismas opciones que tenían las rutas de login antes de esta fase (N1-4).

function opcionesCookie(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge,
    path: "/",
  };
}

export async function ponerCookieAdmin(token: string): Promise<void> {
  (await cookies()).set(COOKIE_ADMIN, token, opcionesCookie(DURACION_ADMIN_S));
}

export async function ponerCookieUser(token: string): Promise<void> {
  (await cookies()).set(COOKIE_USER, token, opcionesCookie(DURACION_USER_S));
}

export async function borrarCookieAdmin(): Promise<void> {
  (await cookies()).delete(COOKIE_ADMIN);
}

export async function borrarCookieUser(): Promise<void> {
  (await cookies()).delete(COOKIE_USER);
}

/** Lee el valor crudo de una cookie de sesión (para los guards). */
export async function leerCookie(nombre: typeof COOKIE_ADMIN | typeof COOKIE_USER): Promise<string | undefined> {
  return (await cookies()).get(nombre)?.value;
}
