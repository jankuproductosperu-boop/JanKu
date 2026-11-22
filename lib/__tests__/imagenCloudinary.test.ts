import { describe, expect, it } from "vitest";
import { imagenCloudinary, srcSetCloudinary } from "@/lib/imagenCloudinary";

const BASE = "https://res.cloudinary.com/janku/image/upload/";

describe("imagenCloudinary", () => {
  it("añade un tramo nuevo antes de la versión", () => {
    expect(imagenCloudinary(`${BASE}v1795323220/estaticas/banner-header-01.webp`, 720)).toBe(
      `${BASE}f_auto,q_auto,w_720,c_limit/v1795323220/estaticas/banner-header-01.webp`,
    );
  });

  it("añade un tramo nuevo si no hay transformaciones ni versión", () => {
    expect(imagenCloudinary(`${BASE}banners/home/delivery`, 480)).toBe(
      `${BASE}f_auto,q_auto,w_480,c_limit/banners/home/delivery`,
    );
  });

  it("completa el tramo de transformaciones existente sin repetir f_ ni q_", () => {
    expect(imagenCloudinary(`${BASE}f_auto,q_auto/banners/campanas/popup-oferta-1`, 420)).toBe(
      `${BASE}f_auto,q_auto,w_420,c_limit/banners/campanas/popup-oferta-1`,
    );
  });

  it("cambia un w_ previo y respeta el recorte que ya tenía", () => {
    expect(imagenCloudinary(`${BASE}f_auto,q_auto,w_400,c_fill/productos/x/y-1`, 200)).toBe(
      `${BASE}f_auto,q_auto,w_200,c_fill/productos/x/y-1`,
    );
  });

  it("respeta f_ y q_ distintos y la versión tras el tramo", () => {
    expect(imagenCloudinary(`${BASE}q_80,f_webp/v123/a/b.jpg`, 640)).toBe(
      `${BASE}q_80,f_webp,w_640,c_limit/v123/a/b.jpg`,
    );
  });

  it("no confunde una carpeta con guion bajo con una transformación", () => {
    expect(imagenCloudinary(`${BASE}en_oferta/foto.webp`, 300)).toBe(
      `${BASE}f_auto,q_auto,w_300,c_limit/en_oferta/foto.webp`,
    );
  });

  it("redondea el ancho hacia arriba", () => {
    expect(imagenCloudinary(`${BASE}v1/a.webp`, 419.2)).toBe(`${BASE}f_auto,q_auto,w_420,c_limit/v1/a.webp`);
  });

  it("deja igual las URL que no son de imágenes de Cloudinary", () => {
    const otras = [
      "https://img.jan-ku.com/foto.webp",
      "https://img.youtube.com/vi/abc/hqdefault.jpg",
      "http://res.cloudinary.com/janku/image/upload/v1/a.webp",
      "https://res.cloudinary.com/janku/video/upload/v1/a.mp4",
      "/og-image.png",
    ];
    for (const url of otras) expect(imagenCloudinary(url, 400)).toBe(url);
  });

  it("deja igual una URL vacía o un ancho no válido", () => {
    expect(imagenCloudinary("", 400)).toBe("");
    expect(imagenCloudinary(`${BASE}v1/a.webp`, 0)).toBe(`${BASE}v1/a.webp`);
    expect(imagenCloudinary(`${BASE}v1/a.webp`, Number.NaN)).toBe(`${BASE}v1/a.webp`);
  });
});

describe("srcSetCloudinary", () => {
  it("arma un candidato por ancho, ordenado y sin repetidos", () => {
    expect(srcSetCloudinary(`${BASE}v1/a.webp`, [840, 420, 840])).toBe(
      `${BASE}f_auto,q_auto,w_420,c_limit/v1/a.webp 420w, ${BASE}f_auto,q_auto,w_840,c_limit/v1/a.webp 840w`,
    );
  });

  it("no da srcSet para URL ajenas, vacías o sin anchos válidos", () => {
    expect(srcSetCloudinary("https://img.jan-ku.com/foto.webp", [400])).toBeUndefined();
    expect(srcSetCloudinary("", [400])).toBeUndefined();
    expect(srcSetCloudinary(`${BASE}v1/a.webp`, [0, -5])).toBeUndefined();
  });
});
