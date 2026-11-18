import { describe, expect, it } from "vitest";
import { esIPPrivada, ipDesdeCabeceras, sanearIP } from "@/lib/clientIp";

const REAL = "190.12.34.56"; // cliente en Huancayo
const BORDE = "172.71.151.63"; // borde de Cloudflare de Render
const INTERNA = "10.27.70.5"; // balanceador interno de Render

/** Lo que llega a la app (medido en producción): Render añade "<cliente>, <borde>, <interna>". */
function peticion(falsas: Record<string, string> = {}): Headers {
  const h = new Headers(falsas);
  const previo = falsas["x-forwarded-for"];
  h.set("x-forwarded-for", [previo, REAL, BORDE, INTERNA].filter(Boolean).join(", "));
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

  it("nunca devuelve la IP del borde de Cloudflare ni la interna", () => {
    expect(ipDesdeCabeceras(peticion())).not.toBe(BORDE);
    expect(ipDesdeCabeceras(peticion())).not.toBe(INTERNA);
  });

  it("la cadena real de producción da la IP del dueño", () => {
    const h = new Headers({ "x-forwarded-for": "38.25.29.31, 172.71.151.63, 10.27.70.5" });
    expect(ipDesdeCabeceras(h)).toBe("38.25.29.31");
  });

  it("si Render quitara su salto interno, sigue acertando", () => {
    expect(ipDesdeCabeceras(new Headers({ "x-forwarded-for": `9.9.9.9, ${REAL}, ${BORDE}` }))).toBe(REAL);
  });

  it("varios saltos internos a la derecha también se saltan", () => {
    const h = new Headers({ "x-forwarded-for": `1.1.1.1, ${REAL}, ${BORDE}, 10.0.0.1, 192.168.1.1` });
    expect(ipDesdeCabeceras(h)).toBe(REAL);
  });

  it("una IP privada falsificada a la izquierda no cambia nada", () => {
    expect(ipDesdeCabeceras(peticion({ "x-forwarded-for": "10.0.0.1, 127.0.0.1" }))).toBe(REAL);
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

describe("esIPPrivada", () => {
  it.each(["10.27.70.5", "127.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1", "100.64.0.1", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:10.0.0.1"])(
    "%s es privada",
    (ip) => expect(esIPPrivada(ip)).toBe(true),
  );
  it.each(["38.25.29.31", "172.71.151.63", "104.22.17.40", "172.15.0.1", "172.32.0.1", "190.12.34.56", "2800:200::1"])(
    "%s es pública",
    (ip) => expect(esIPPrivada(ip)).toBe(false),
  );
});
