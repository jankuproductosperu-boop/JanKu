import { describe, expect, it } from "vitest";
import {
  TURNSTILE_TOKEN_MAX,
  interpretarSiteverify,
  ipParaSiteverify,
  rechazoTurnstile,
  separarTokenTurnstile,
  turnstileConfigurado,
} from "@/lib/turnstile";

describe("turnstileConfigurado", () => {
  it("exige las dos claves", () => {
    expect(turnstileConfigurado("s", "k")).toBe(true);
    expect(turnstileConfigurado("s", "")).toBe(false);
    expect(turnstileConfigurado("", "k")).toBe(false);
    expect(turnstileConfigurado(undefined, undefined)).toBe(false);
    expect(turnstileConfigurado("  ", "k")).toBe(false);
  });
});

describe("separarTokenTurnstile", () => {
  it("quita el campo y devuelve el token", () => {
    const r = separarTokenTurnstile({ a: 1, turnstileToken: "abc" });
    expect(r.token).toBe("abc");
    expect(r.cuerpo).toEqual({ a: 1 });
  });

  it("sin el campo, el cuerpo vuelve igual (la misma referencia)", () => {
    const cuerpo = { a: 1 };
    const r = separarTokenTurnstile(cuerpo);
    expect(r.token).toBeNull();
    expect(r.cuerpo).toBe(cuerpo);
  });

  it("un token que no es texto válido cuenta como ausente, pero igual se quita", () => {
    for (const malo of [5, null, "", ["x"], { x: 1 }, "x".repeat(TURNSTILE_TOKEN_MAX + 1)]) {
      const r = separarTokenTurnstile({ a: 1, turnstileToken: malo });
      expect(r.token).toBeNull();
      expect(r.cuerpo).toEqual({ a: 1 });
    }
    expect(separarTokenTurnstile({ turnstileToken: "x".repeat(TURNSTILE_TOKEN_MAX) }).token).toHaveLength(TURNSTILE_TOKEN_MAX);
  });

  it("no toca cuerpos que no son objetos", () => {
    for (const crudo of [null, [], ["turnstileToken"], "texto", 5, undefined]) {
      const r = separarTokenTurnstile(crudo);
      expect(r.token).toBeNull();
      expect(r.cuerpo).toBe(crudo);
    }
  });
});

describe("ipParaSiteverify", () => {
  it("solo manda IPs públicas", () => {
    expect(ipParaSiteverify("190.12.34.56")).toBe("190.12.34.56");
    expect(ipParaSiteverify("2800:200:e840::1")).toBe("2800:200:e840::1");
    expect(ipParaSiteverify("::1")).toBeNull();
    expect(ipParaSiteverify("10.0.0.1")).toBeNull();
    expect(ipParaSiteverify("unknown")).toBeNull();
    expect(ipParaSiteverify("")).toBeNull();
  });
});

describe("interpretarSiteverify", () => {
  it("success true es válido", () => {
    expect(interpretarSiteverify(200, { success: true, "error-codes": [] }).resultado).toBe("valido");
  });

  it("token malo, vencido o repetido es inválido", () => {
    for (const c of ["invalid-input-response", "timeout-or-duplicate", "missing-input-response", "bad-request"]) {
      const r = interpretarSiteverify(200, { success: false, "error-codes": [c] });
      expect(r.resultado).toBe("invalido");
      expect(r.motivo).toBe(c);
    }
    expect(interpretarSiteverify(200, { success: false }).resultado).toBe("invalido");
  });

  it("error interno de Cloudflare o clave secreta mal puesta es no disponible", () => {
    expect(interpretarSiteverify(200, { success: false, "error-codes": ["internal-error"] }).resultado).toBe("no-disponible");
    const conf = interpretarSiteverify(200, { success: false, "error-codes": ["invalid-input-secret"] });
    expect(conf.resultado).toBe("no-disponible");
    expect(conf.motivo.startsWith("configuracion:")).toBe(true);
    expect(interpretarSiteverify(200, { success: false, "error-codes": ["missing-input-secret"] }).resultado).toBe("no-disponible");
  });

  it("una respuesta ilegible o un 5xx sin códigos es no disponible", () => {
    expect(interpretarSiteverify(502, null).resultado).toBe("no-disponible");
    expect(interpretarSiteverify(200, "hola").resultado).toBe("no-disponible");
    expect(interpretarSiteverify(200, { success: "true" }).resultado).toBe("no-disponible");
    expect(interpretarSiteverify(503, { success: false }).resultado).toBe("no-disponible");
  });

  it("el motivo solo lleva códigos saneados y pocos", () => {
    const r = interpretarSiteverify(200, {
      success: false,
      "error-codes": ["a<b>c", 5, "x".repeat(100), "d", "e", "f", "g", "h"],
    });
    expect(r.motivo).toBe(`abc,${"x".repeat(40)},d,e,f`);
  });
});

describe("rechazoTurnstile", () => {
  it("válido y desactivado siguen", () => {
    expect(rechazoTurnstile("valido", false)).toBeNull();
    expect(rechazoTurnstile("desactivado", false)).toBeNull();
  });

  it("inválido siempre se rechaza, también en el checkout", () => {
    expect(rechazoTurnstile("invalido", false)).toBe("invalido");
    expect(rechazoTurnstile("invalido", true)).toBe("invalido");
  });

  it("no disponible: el checkout sigue, el resto se rechaza (Q2)", () => {
    expect(rechazoTurnstile("no-disponible", true)).toBeNull();
    expect(rechazoTurnstile("no-disponible", false)).toBe("no-disponible");
  });
});
