import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/html";

describe("escapeHtml", () => {
  it("escapa los cinco caracteres especiales", () => {
    expect(escapeHtml('<b>"A&B"</b>')).toBe("&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;");
    expect(escapeHtml("O'Higgins")).toBe("O&#39;Higgins");
  });

  it("no toca texto normal ni acentos", () => {
    expect(escapeHtml("José Ñuñez 👋")).toBe("José Ñuñez 👋");
    expect(escapeHtml("")).toBe("");
  });

  it("no deja etiquetas activas", () => {
    expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapa & ya escapados (no es idempotente a propósito)", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});
