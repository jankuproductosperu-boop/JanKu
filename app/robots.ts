import type { MetadataRoute } from "next";
import { SITE } from "@/lib/siteConfig";

// Fase 24: qué puede recorrer Google. Las zonas privadas y de compra no se indexan.
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login-admin", "/api/", "/auth/", "/checkout", "/carrito", "/pedido/", "/favoritos", "/busqueda"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
