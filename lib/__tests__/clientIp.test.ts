import { describe, expect, it } from "vitest";
import { ipDesdeCabeceras, sanearIP } from "@/lib/clientIp";

const REAL = "190.12.34.56"; // cliente en Huancayo
const BORDE = "104.22.17.40"; // borde de Cloudflare de Render

/** Lo que llega a la app: Render añade "<cliente>, <borde>" a lo que mande el visitante. */
function peticion(falsas: Record<string, string> = {}): Headers {
  const h = new Headers(falsas);
  const previo = falsas["x-forwarded-for"];
  h.set("x-forwarded-for", [previo, REAL, BORDE].filter(Boolean).join(", "));
  return h;
}

const intentosDeFalsificacion: Record<string, string>[] = [
  {},
  { "x-forwarded-for": "1.1.1.1" },
  { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" },
  { "cf-connecting-ip": "1.1.1.1" },
  { "true-client-ip": "1.1.1.1" },
  { "x-real-ip": "1.1.1.1" },
  { "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" },
];

describe("ipDesdeCabeceras", () => {
  it.each(intentosDeFalsificacion)("ignora cabeceras falsificadas %o", (falsas) => {
    expect(ipDesdeCabeceras(peticion(falsas))).toBe(REAL);
  });

  it("nunca devuelve la IP del borde de Cloudflare", () => {
    expect(ipDesdeCabeceras(peticion())).not.toBe(BORDE);
  });

  it("con una sola entrada (local) usa esa", () => {
    expect(ipDesdeCabeceras(new Headers({ "x-forwarded-for": "::1" }))).toBe("::1");
  });

  it("sin x-forwarded-for es unknown, aunque venga cf-connecting-ip", () => {
    expect(ipDesdeCabeceras(new Headers({ "cf-connecting-ip": "1.1.1.1" }))).toBe("unknown");
  });

  it("entrada basura queda saneada o unknown", () => {
    expect(ipDesdeCabeceras(new Headers({ "x-forwarded-for": "<>!?, zz" }))).toBe("unknown");
    expect(sanearIP("1.2.3.4;DROP")).toBe("1.2.3.4D");
    expect(sanearIP("a".repeat(100))).toHaveLength(45);
  });
});

describe("el límite se aplica igual aunque se falsifiquen cabeceras", () => {
  it("cada petición falsificada cuenta en la misma clave login-admin:ip", () => {
    // Simula el contador por clave de server/auth/rateLimit (max 3 en login-admin).
    const MAX = 3;
    const contador: Record<string, number> = {};
    const resultados = intentosDeFalsificacion.slice(0, 4).map((falsas) => {
      const clave = `login-admin:ip:${ipDesdeCabeceras(peticion(falsas))}`;
      contador[clave] = (contador[clave] ?? 0) + 1;
      return contador[clave] < MAX; // permitido mientras no llegue al máximo de fallos
    });

    expect(Object.keys(contador)).toEqual([`login-admin:ip:${REAL}`]);
    expect(resultados).toEqual([true, true, false, false]);
  });
});
