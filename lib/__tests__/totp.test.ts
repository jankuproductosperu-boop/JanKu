import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  agruparSecreto,
  base32Codificar,
  base32Decodificar,
  contadorEnBytes,
  formatearCodigoRescate,
  hotp,
  normalizarCodigoRescate,
  normalizarCodigoTotp,
  pasoDe,
  pasosCandidatos,
  truncar,
  uriOtpauth,
  type HmacSha1,
} from "@/lib/totp";

const sha1: HmacSha1 = (clave, mensaje) => new Uint8Array(createHmac("sha1", clave).update(mensaje).digest());
// Clave de los vectores de RFC 4226 y RFC 6238 (SHA-1): "12345678901234567890" en ASCII.
const CLAVE_RFC = new TextEncoder().encode("12345678901234567890");

describe("HOTP · vectores de RFC 4226, apéndice D", () => {
  const esperados = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
  esperados.forEach((codigo, contador) => {
    it(`contador ${contador} → ${codigo}`, () => {
      expect(hotp(sha1, CLAVE_RFC, contador)).toBe(codigo);
    });
  });

  it("truncamiento del ejemplo de §5.4", () => {
    const hmac = Uint8Array.from(Buffer.from("1f8698690e02ca16618550ef7f19da8e945b555a", "hex"));
    expect(truncar(hmac)).toBe("872921");
  });
});

describe("TOTP · vectores de RFC 6238, apéndice B (SHA-1, 8 dígitos)", () => {
  const vectores: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];
  for (const [segundos, codigo] of vectores) {
    it(`T = ${segundos} s → ${codigo}`, () => {
      expect(hotp(sha1, CLAVE_RFC, pasoDe(segundos * 1000), 8)).toBe(codigo);
    });
  }

  it("con 6 dígitos son los últimos 6 del de 8", () => {
    expect(hotp(sha1, CLAVE_RFC, pasoDe(59_000))).toBe("287082");
  });
});

describe("contador y pasos", () => {
  it("contador en 8 bytes big-endian", () => {
    expect(Array.from(contadorEnBytes(1))).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(Array.from(contadorEnBytes(0x0123456789))).toEqual([0, 0, 0, 0x01, 0x23, 0x45, 0x67, 0x89]);
  });

  it("rechaza contadores negativos o no enteros", () => {
    expect(() => contadorEnBytes(-1)).toThrow();
    expect(() => contadorEnBytes(1.5)).toThrow();
  });

  it("paso de 30 s", () => {
    expect(pasoDe(0)).toBe(0);
    expect(pasoDe(29_999)).toBe(0);
    expect(pasoDe(30_000)).toBe(1);
  });

  it("ventana de ±1 paso, sin negativos", () => {
    expect(pasosCandidatos(100)).toEqual([99, 100, 101]);
    expect(pasosCandidatos(0)).toEqual([0, 1]);
  });
});

describe("base32", () => {
  it("vectores de RFC 4648 §10 (sin relleno)", () => {
    const casos: [string, string][] = [
      ["", ""],
      ["f", "MY"],
      ["fo", "MZXQ"],
      ["foo", "MZXW6"],
      ["foob", "MZXW6YQ"],
      ["fooba", "MZXW6YTB"],
      ["foobar", "MZXW6YTBOI"],
    ];
    for (const [texto, b32] of casos) {
      expect(base32Codificar(new TextEncoder().encode(texto))).toBe(b32);
      expect(new TextDecoder().decode(base32Decodificar(b32) ?? new Uint8Array())).toBe(texto);
    }
  });

  it("ida y vuelta de 20 bytes", () => {
    const bytes = Uint8Array.from({ length: 20 }, (_, i) => (i * 37 + 11) % 256);
    const b32 = base32Codificar(bytes);
    expect(b32).toHaveLength(32);
    expect(Array.from(base32Decodificar(b32) ?? [])).toEqual(Array.from(bytes));
  });

  it("acepta minúsculas, espacios y relleno; rechaza caracteres ajenos", () => {
    expect(base32Decodificar("mzxw 6ytb oi==")).toEqual(base32Decodificar("MZXW6YTBOI"));
    expect(base32Decodificar("MZXW1")).toBeNull();
  });

  it("agrupa de 4 en 4", () => {
    expect(agruparSecreto("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
  });
});

describe("formatos de código", () => {
  it("TOTP: 6 dígitos, espacios permitidos", () => {
    expect(normalizarCodigoTotp("123 456")).toBe("123456");
    expect(normalizarCodigoTotp("12345")).toBeNull();
    expect(normalizarCodigoTotp("12345a")).toBeNull();
    expect(normalizarCodigoTotp("1234567")).toBeNull();
  });

  it("rescate: 10 caracteres del alfabeto, sin importar guion ni mayúsculas", () => {
    expect(normalizarCodigoRescate("abcde-23456")).toBe("ABCDE23456");
    expect(normalizarCodigoRescate("ABCDE 23456")).toBe("ABCDE23456");
    expect(normalizarCodigoRescate("ABCDE-2345")).toBeNull();
    expect(normalizarCodigoRescate("ABCDO-23456")).toBeNull(); // O no está en el alfabeto
    expect(normalizarCodigoRescate("123456")).toBeNull();
    expect(formatearCodigoRescate("ABCDE23456")).toBe("ABCDE-23456");
  });
});

describe("uriOtpauth", () => {
  it("formato Key URI con emisor y cuenta codificados", () => {
    expect(uriOtpauth({ emisor: "Janku Panel", cuenta: "ana", secreto: "JBSWY3DPEHPK3PXP" })).toBe(
      "otpauth://totp/Janku%20Panel:ana?secret=JBSWY3DPEHPK3PXP&issuer=Janku%20Panel&algorithm=SHA1&digits=6&period=30",
    );
  });
});
