import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const texto = (link: string) => decodeURIComponent(link.split("?text=")[1] ?? "");

describe("buildWhatsAppLink", () => {
  it("sin número no hay link", () => expect(buildWhatsAppLink("", "Mochila", "/producto/x")).toBe(""));
  it("sin variante: el mensaje de siempre", () =>
    expect(texto(buildWhatsAppLink("51 999-888-777", "Mochila", "/producto/x"))).toMatch(/^Hola, estoy interesado\(a\) en: Mochila\n/));
  it("con variante: la añade al nombre", () =>
    expect(texto(buildWhatsAppLink("51999888777", "Mochila", "/producto/x", "Color: Negro"))).toMatch(
      /en: Mochila \(Color: Negro\)\n/,
    ));
  it("limpia el número", () => expect(buildWhatsAppLink("51 999-888-777", "M", "/p")).toMatch(/^https:\/\/wa\.me\/51999888777\?/));
});
