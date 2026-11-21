import { describe, expect, it } from "vitest";
import {
  agruparFuentes,
  codigoDeRutaProducto,
  fechaDeGA,
  formatearDuracion,
  nombreCanal,
  nombreDispositivo,
  nombreFuente,
  ultimosDias,
  variacion,
} from "@/lib/analytics";

describe("variacion", () => {
  it("sube", () => expect(variacion(120, 100)).toBe(20));
  it("baja con un decimal", () => expect(variacion(96.04, 100)).toBe(-4));
  it("redondea a 1 decimal", () => expect(variacion(1162, 1000)).toBe(16.2));
  it("sin base → null", () => {
    expect(variacion(10, 0)).toBeNull();
    expect(variacion(10, Number.NaN)).toBeNull();
  });
});

describe("codigoDeRutaProducto", () => {
  it("toma el código tras el último guion", () => expect(codigoDeRutaProducto("/producto/audifonos-bt-a1b2c3d4")).toBe("a1b2c3d4"));
  it("acepta barra final", () => expect(codigoDeRutaProducto("/producto/audifonos-a1b2c3d4/")).toBe("a1b2c3d4"));
  it("decodifica", () => expect(codigoDeRutaProducto("/producto/cami%C3%B3n-x9y8z7w6")).toBe("x9y8z7w6"));
  it("otras rutas → null", () => {
    expect(codigoDeRutaProducto("/")).toBeNull();
    expect(codigoDeRutaProducto("/promocion/abc")).toBeNull();
    expect(codigoDeRutaProducto("/producto/")).toBeNull();
    expect(codigoDeRutaProducto("/producto/a/b")).toBeNull();
  });
  it("codificación rota → null", () => expect(codigoDeRutaProducto("/producto/%E0%A4%A")).toBeNull());
});

describe("formatearDuracion", () => {
  it("segundos", () => expect(formatearDuracion(45)).toBe("45s"));
  it("minutos", () => expect(formatearDuracion(220)).toBe("3m 40s"));
  it("horas", () => expect(formatearDuracion(3900)).toBe("1h 05m"));
  it("negativo o inválido → 0s", () => {
    expect(formatearDuracion(-5)).toBe("0s");
    expect(formatearDuracion(Number.NaN)).toBe("0s");
  });
});

describe("fechaDeGA y ultimosDias", () => {
  it("convierte AAAAMMDD", () => expect(fechaDeGA("20261120")).toBe("2026-11-20"));
  it("rechaza otros formatos", () => expect(fechaDeGA("2026-11-20")).toBeNull());
  it("últimos 3 días cruzando de mes", () => expect(ultimosDias("2026-12-01", 3)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01"]));
  it("sin días → vacío", () => expect(ultimosDias("2026-12-01", 0)).toEqual([]));
});

describe("nombres", () => {
  it("canal conocido y desconocido", () => {
    expect(nombreCanal("Organic Search")).toBe("Búsqueda en Google");
    expect(nombreCanal("Nuevo canal")).toBe("Nuevo canal");
  });
  it("dispositivo", () => expect(nombreDispositivo("mobile")).toBe("Celular"));
});

describe("fuentes", () => {
  it("nombres conocidos", () => {
    expect(nombreFuente("(direct)")).toBe("Directo");
    expect(nombreFuente("m.facebook.com")).toBe("Facebook");
    expect(nombreFuente("otra.pe")).toBe("otra.pe");
  });
  it("une variantes, deja 4 y suma Otros", () => {
    const r = agruparFuentes([
      { fuente: "google", sesiones: 50 },
      { fuente: "m.facebook.com", sesiones: 15 },
      { fuente: "facebook.com", sesiones: 10 },
      { fuente: "(direct)", sesiones: 10 },
      { fuente: "tiktok.com", sesiones: 5 },
      { fuente: "a.pe", sesiones: 6 },
      { fuente: "b.pe", sesiones: 4 },
    ]);
    expect(r.map((x) => x.fuente)).toEqual(["Google", "Facebook", "Directo", "a.pe", "Otros"]);
    expect(r[1].sesiones).toBe(25);
    expect(r[4].sesiones).toBe(9);
    expect(r[0].porcentaje).toBe(50);
  });
  it("sin sesiones → vacío", () => expect(agruparFuentes([{ fuente: "google", sesiones: 0 }])).toEqual([]));
});
