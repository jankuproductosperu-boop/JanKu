// Verificación en dos pasos del panel (fase 26b): TOTP (RFC 6238) sobre HOTP (RFC 4226).
// Funciones puras. El HMAC-SHA1 lo pone quien llama (node:crypto en server/auth/totp.ts), así
// este archivo no depende del entorno y se prueba contra los vectores oficiales.

export const PASO_SEGUNDOS = 30;
export const DIGITOS = 6;
/** Se acepta el paso actual y uno antes o después (reloj del celular algo desfasado). */
export const VENTANA_PASOS = 1;

export type HmacSha1 = (clave: Uint8Array, mensaje: Uint8Array) => Uint8Array;

/** Número de paso de 30 s para un instante en milisegundos. */
export function pasoDe(ms: number): number {
  return Math.floor(ms / 1000 / PASO_SEGUNDOS);
}

/** Contador de 8 bytes en orden big-endian (RFC 4226 §5.2). */
export function contadorEnBytes(contador: number): Uint8Array {
  if (!Number.isSafeInteger(contador) || contador < 0) throw new Error("Contador TOTP inválido");
  const bytes = new Uint8Array(8);
  let n = contador;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = n % 256;
    n = Math.floor(n / 256);
  }
  return bytes;
}

/** Truncamiento dinámico (RFC 4226 §5.3). */
export function truncar(hmac: Uint8Array, digitos: number = DIGITOS): string {
  if (hmac.length < 20) throw new Error("HMAC demasiado corto");
  const off = hmac[hmac.length - 1] & 0x0f;
  const binario =
    (hmac[off] & 0x7f) * 2 ** 24 + hmac[off + 1] * 2 ** 16 + hmac[off + 2] * 2 ** 8 + hmac[off + 3];
  return String(binario % 10 ** digitos).padStart(digitos, "0");
}

export function hotp(hmac: HmacSha1, clave: Uint8Array, contador: number, digitos: number = DIGITOS): string {
  return truncar(hmac(clave, contadorEnBytes(contador)), digitos);
}

/** Pasos que se prueban para un código: el actual ± la ventana, sin negativos. */
export function pasosCandidatos(paso: number, ventana: number = VENTANA_PASOS): number[] {
  const lista: number[] = [];
  for (let p = paso - ventana; p <= paso + ventana; p++) if (p >= 0) lista.push(p);
  return lista;
}

// ── Base32 (RFC 4648, sin relleno): así guardan la clave las apps de autenticación ──

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Codificar(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let salida = "";
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
    valor &= (1 << bits) - 1; // solo quedan los bits aún no escritos
  }
  if (bits > 0) salida += ALFABETO_BASE32[(valor << (5 - bits)) & 31];
  return salida;
}

/** Acepta minúsculas, espacios y relleno "=". Devuelve null si hay caracteres que no son base32. */
export function base32Decodificar(texto: string): Uint8Array | null {
  const limpio = texto.replace(/[\s=]/g, "").toUpperCase();
  const salida: number[] = [];
  let bits = 0;
  let valor = 0;
  for (const ch of limpio) {
    const i = ALFABETO_BASE32.indexOf(ch);
    if (i < 0) return null;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      salida.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
    valor &= (1 << bits) - 1;
  }
  return new Uint8Array(salida);
}

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP", para escribirla a mano. */
export function agruparSecreto(secreto: string): string {
  return secreto.replace(/(.{4})(?=.)/g, "$1 ");
}

/** Enlace que leen Google Authenticator, Microsoft Authenticator y similares (formato Key URI). */
export function uriOtpauth(o: { emisor: string; cuenta: string; secreto: string }): string {
  const emisor = encodeURIComponent(o.emisor);
  const etiqueta = `${emisor}:${encodeURIComponent(o.cuenta)}`;
  return `otpauth://totp/${etiqueta}?secret=${o.secreto}&issuer=${emisor}&algorithm=SHA1&digits=${DIGITOS}&period=${PASO_SEGUNDOS}`;
}

/** "123 456" → "123456" si son 6 dígitos; si no, null. */
export function normalizarCodigoTotp(texto: string): string | null {
  const limpio = texto.replace(/\s/g, "");
  return new RegExp(`^\\d{${DIGITOS}}$`).test(limpio) ? limpio : null;
}

// ── Códigos de rescate: 10 caracteres sin los que se confunden (0/O, 1/I/L) ──

export const ALFABETO_RESCATE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_RESCATE = 10;
export const CANTIDAD_RESCATE = 8;

/** Mayúsculas, sin espacios ni guiones. null si no tiene la forma de un código de rescate. */
export function normalizarCodigoRescate(texto: string): string | null {
  const limpio = texto.replace(/[\s-]/g, "").toUpperCase();
  if (limpio.length !== LARGO_RESCATE) return null;
  for (const ch of limpio) if (!ALFABETO_RESCATE.includes(ch)) return null;
  return limpio;
}

/** "ABCDE23456" → "ABCDE-23456". */
export function formatearCodigoRescate(codigo: string): string {
  const mitad = Math.ceil(codigo.length / 2);
  return `${codigo.slice(0, mitad)}-${codigo.slice(mitad)}`;
}
