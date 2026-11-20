import { describe, expect, it } from "vitest";
import { leerEstadoCookies, urlSinConsulta } from "@/lib/consentimiento";

describe("urlSinConsulta", () => {
  it("quita la consulta del pedido", () =>
    expect(urlSinConsulta("https://jan-ku.com/pedido/JK-261119-AB12?t=secreto")).toBe("https://jan-ku.com/pedido/JK-261119-AB12"));
  it("quita el fragmento", () => expect(urlSinConsulta("https://jan-ku.com/terminos#pago")).toBe("https://jan-ku.com/terminos"));
  it("deja igual una URL sin consulta", () => expect(urlSinConsulta("https://jan-ku.com/")).toBe("https://jan-ku.com/"));
});

describe("leerEstadoCookies", () => {
  it("acepta los dos valores válidos", () => {
    expect(leerEstadoCookies('"aceptadas"')).toBe("aceptadas");
    expect(leerEstadoCookies('"rechazadas"')).toBe("rechazadas");
  });
  it("cualquier otra cosa es pendiente", () => {
    expect(leerEstadoCookies('"pendiente"')).toBe("pendiente");
    expect(leerEstadoCookies("true")).toBe("pendiente");
    expect(leerEstadoCookies("no-json")).toBe("pendiente");
  });
});
