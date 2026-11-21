import type { MetadataRoute } from "next";
import { SITE } from "@/lib/siteConfig";
import { buildProductUrl } from "@/lib/productUrl";
import { listarCategorias } from "@/server/services/category.service";
import { listarProductosPublicos } from "@/server/services/product.service";

// Fase 24: mapa del sitio para Google. Se genera en cada petición (sin conexión a la base al construir).
export const dynamic = "force-dynamic";

const PAGINAS_FIJAS = [
  "", "/promociones", "/contacto", "/terminos", "/privacidad", "/cambios-y-devoluciones", "/envios", "/cookies",
  "/libro-de-reclamaciones",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [categorias, productos] = await Promise.all([listarCategorias(), listarProductosPublicos()]);

  return [
    ...PAGINAS_FIJAS.map((ruta) => ({ url: `${base}${ruta}`, changeFrequency: "weekly" as const, priority: ruta ? 0.4 : 1 })),
    ...categorias
      .filter((c) => c.activo !== false && c.slug)
      .map((c) => ({ url: `${base}/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...productos.map((p) => ({
      url: `${base}/producto/${buildProductUrl(p.nombre, p.codigoUrl)}`,
      ...(p.updatedAt ? { lastModified: p.updatedAt } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
