import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import {
  ALFABETO_RESCATE,
  CANTIDAD_RESCATE,
  LARGO_RESCATE,
  base32Codificar,
  formatearCodigoRescate,
  hotp,
  pasoDe,
  pasosCandidatos,
  type HmacSha1,
} from "@/lib/totp";

// Fase 26b. Una sola variable, TOTP_ENC_KEY (32 bytes aleatorios en base64), de la que se derivan
// con HKDF tres claves independientes: cifrado del secreto TOTP, HMAC de las IP y HMAC de los
// códigos de rescate. Una copia de la base sin esta variable no sirve para generar códigos, ver IP
// ni probar códigos de rescate por fuerza bruta.

type Subclaves = { cifrado: Buffer; ip: Buffer; rescate: Buffer };
let cache: { crudo: string; sub: Subclaves } | null = null;

function subclaves(): Subclaves {
  const crudo = process.env.TOTP_ENC_KEY;
  if (!crudo) throw new Error("Falta la variable de entorno TOTP_ENC_KEY");
  if (cache && cache.crudo === crudo) return cache.sub;
  const raiz = Buffer.from(crudo, "base64");
  if (raiz.length !== 32) throw new Error("TOTP_ENC_KEY debe tener 32 bytes en base64");
  const derivar = (uso: string) => Buffer.from(hkdfSync("sha256", raiz, Buffer.alloc(0), `janku-2fa:${uso}`, 32));
  const sub = { cifrado: derivar("cifrado"), ip: derivar("ip"), rescate: derivar("rescate") };
  cache = { crudo, sub };
  return sub;
}

/** true si TOTP_ENC_KEY está y es válida. Para avisar en la pantalla de seguridad sin lanzar. */
export function claveConfigurada(): boolean {
  try {
    subclaves();
    return true;
  } catch {
    return false;
  }
}

const sha1: HmacSha1 = (clave, mensaje) => new Uint8Array(createHmac("sha1", clave).update(mensaje).digest());

// ── Secreto TOTP ─────────────────────────────────────────────────────────────

/** 20 bytes aleatorios (160 bits, lo que recomienda RFC 4226) y su forma base32 para la app. */
export function generarSecreto(): { bytes: Buffer; base32: string } {
  const bytes = randomBytes(20);
  return { bytes, base32: base32Codificar(bytes) };
}

const VERSION_CIFRADO = "v1";

/**
 * AES-256-GCM con IV aleatorio. El id del administrador va como dato asociado: un secreto copiado
 * al documento de otro administrador no se descifra.
 */
export function cifrarSecreto(secreto: Buffer, adminId: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", subclaves().cifrado, iv);
  c.setAAD(Buffer.from(`admin:${adminId}`));
  const cifrado = Buffer.concat([c.update(secreto), c.final()]);
  const tag = c.getAuthTag();
  return [VERSION_CIFRADO, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

/** Lanza si el texto no es válido, fue alterado o la clave no coincide. */
export function descifrarSecreto(texto: string, adminId: string): Buffer {
  const partes = texto.split(".");
  if (partes.length !== 4 || partes[0] !== VERSION_CIFRADO) throw new Error("Secreto TOTP con formato desconocido");
  const [, iv, tag, cifrado] = partes.map((p, i) => (i === 0 ? Buffer.alloc(0) : Buffer.from(p, "base64url")));
  const d = createDecipheriv("aes-256-gcm", subclaves().cifrado, iv);
  d.setAAD(Buffer.from(`admin:${adminId}`));
  d.setAuthTag(tag);
  return Buffer.concat([d.update(cifrado), d.final()]);
}

function igualesTiempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Devuelve el paso con que coincide el código, o null. Solo cuenta un paso posterior a `ultimoPaso`:
 * un código ya usado (o uno anterior) no vale dos veces. Se prueban todos los pasos de la ventana,
 * sin cortar en el primero, para que el tiempo no dependa de cuál coincide.
 */
export function verificarTotp(
  secreto: Buffer,
  codigo: string,
  ultimoPaso: number | undefined,
  ahoraMs: number = Date.now(),
): number | null {
  let coincide: number | null = null;
  for (const paso of pasosCandidatos(pasoDe(ahoraMs))) {
    const ok = igualesTiempoConstante(hotp(sha1, secreto, paso), codigo);
    if (ok && (ultimoPaso === undefined || paso > ultimoPaso) && coincide === null) coincide = paso;
  }
  return coincide;
}

// ── Códigos de rescate ───────────────────────────────────────────────────────

export function hashCodigoRescate(normalizado: string): string {
  return createHmac("sha256", subclaves().rescate).update(normalizado).digest("hex");
}

/** 8 códigos nuevos: el texto para mostrarlo UNA vez y los hash para guardar. */
export function generarCodigosRescate(): { codigos: string[]; hashes: string[] } {
  const codigos: string[] = [];
  const hashes: string[] = [];
  while (codigos.length < CANTIDAD_RESCATE) {
    let c = "";
    for (let i = 0; i < LARGO_RESCATE; i++) c += ALFABETO_RESCATE[randomInt(ALFABETO_RESCATE.length)];
    const h = hashCodigoRescate(c);
    if (hashes.includes(h)) continue; // repetido (casi imposible): se genera otro
    codigos.push(formatearCodigoRescate(c));
    hashes.push(h);
  }
  return { codigos, hashes };
}

// ── IP ───────────────────────────────────────────────────────────────────────

/** La IP nunca se guarda en claro: solo su HMAC. */
export function hmacIp(ip: string): string {
  return createHmac("sha256", subclaves().ip).update(ip).digest("hex");
}
