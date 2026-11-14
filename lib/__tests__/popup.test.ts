import { describe, expect, it } from "vitest";
import { debeMostrarPopup, enlaceSeguro, popupVigente } from "@/lib/popup";

const AHORA = Date.parse("2026-11-13T12:00:00.000Z");
const HORA = 60 * 60 * 1000;

describe("enlaceSeguro", () => {
  it("acepta rutas internas y https", () => {
    expect(enlaceSeguro("/producto/mochila-abc123")).toBe(true);
    expect(enlaceSeguro("/")).toBe(true);
    expect(enlaceSeguro("https://jan-ku.com/promociones")).toBe(true);
  });
  it("rechaza esquemas peligrosos, http y rutas con host", () => {
    expect(enlaceSeguro("javascript:alert(1)")).toBe(false);
    expect(enlaceSeguro("data:text/html,x")).toBe(false);
    expect(enlaceSeguro("http://ejemplo.com")).toBe(false);
    expect(enlaceSeguro("//ejemplo.com")).toBe(false);
    expect(enlaceSeguro("")).toBe(false);
    expect(enlaceSeguro("/con espacio")).toBe(false);
  });
});

describe("popupVigente", () => {
  it("inactivo nunca se muestra", () => {
    expect(popupVigente({ activo: false }, AHORA)).toBe(false);
  });
  it("activo sin fechas se muestra", () => {
    expect(popupVigente({ activo: true }, AHORA)).toBe(true);
  });
  it("respeta desde y hasta", () => {
    expect(popupVigente({ activo: true, desde: "2026-11-14T00:00:00.000Z" }, AHORA)).toBe(false);
    expect(popupVigente({ activo: true, hasta: "2026-11-12T00:00:00.000Z" }, AHORA)).toBe(false);
    expect(popupVigente({ activo: true, desde: "2026-11-01T00:00:00.000Z", hasta: "2026-11-30T00:00:00.000Z" }, AHORA)).toBe(true);
  });
});

describe("debeMostrarPopup", () => {
  it("se muestra si nunca se cerró", () => {
    expect(debeMostrarPopup(null, "v1", AHORA)).toBe(true);
  });
  it("no se muestra dentro de las 24 h", () => {
    expect(debeMostrarPopup({ version: "v1", en: AHORA - 23 * HORA }, "v1", AHORA)).toBe(false);
  });
  it("vuelve a mostrarse pasadas 24 h", () => {
    expect(debeMostrarPopup({ version: "v1", en: AHORA - 24 * HORA }, "v1", AHORA)).toBe(true);
  });
  it("si el popup cambió, se muestra aunque se haya cerrado hace poco", () => {
    expect(debeMostrarPopup({ version: "v1", en: AHORA - HORA }, "v2", AHORA)).toBe(true);
  });
});
