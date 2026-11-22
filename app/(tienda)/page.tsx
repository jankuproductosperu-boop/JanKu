import Header from "@/Components/Header/Header";
import HomeProducts from "@/Components/HomeProducts/HomeProducts";
import BenefitsSection from "@/Components/BenefitsSection/BenefitsSection";
import InfoSection from "@/Components/InfoSection/Infosection";
import { listarBannersActivos } from "@/server/services/banner.service";
import { listarProductosPublicosFiltrados } from "@/server/services/product.service";
import { esNovedad } from "@/lib/novedades";
import type { Metadata } from "next";
import type { Banner, Product } from "@/types";
import type { PosicionBannerInicio } from "@/Components/HomeProducts/HomeProducts";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Compra fácil y seguro en Janku. Todo lo que buscas, en un solo lugar.",
};

// Fase 27 (D-91): el inicio se genera en el servidor en cada visita (sin caché: los cambios del panel se
// ven al instante, y las novedades vencen a su hora). Antes HomeProducts pedía /api/products?home=1 y
// /api/banners desde el navegador; aquí se aplica la MISMA regla, así el contenido y el orden no cambian.
export const dynamic = "force-dynamic";

const POSICIONES: PosicionBannerInicio[] = ["top-left", "top-right", "middle-full", "bottom-left", "bottom-right"];
type BannersInicio = Partial<Record<PosicionBannerInicio, Banner>>;

// Los productos del inicio viajan dentro del HTML (payload de React). Solo se envían los campos que lee
// ProductCard: con el producto completo (descripciones, características, SEO, WhatsApp) el HTML pesaba
// unas 4 veces más y retrasaba la primera pintura. De `imagenes` y `imagenesAdicionales` la tarjeta solo
// usa la portada y la imagen al pasar el ratón, así que se recortan sin cambiar lo que se ve.
function paraTarjeta(p: Product): Product {
  const tarjeta: Product = {
    _id: p._id,
    nombre: p.nombre,
    precio: p.precio,
    slug: p.slug,
    codigoUrl: p.codigoUrl,
    stock: p.stock,
    imagenPrincipal: p.imagenPrincipal,
    imagenes: p.imagenes?.slice(0, 2),
    imagenesAdicionales: p.imagenesAdicionales?.slice(0, 1),
    imagenUrl: p.imagenUrl,
    deliveryHuancayo: p.deliveryHuancayo,
    nuevoHasta: p.nuevoHasta,
    variantes: p.variantes,
  };
  // Sin claves vacías: cada `undefined` también ocupa sitio en el HTML.
  return Object.fromEntries(Object.entries(tarjeta).filter(([, valor]) => valor !== undefined)) as Product;
}

async function cargarInicio(): Promise<{ novedades: Product[]; products: Product[]; banners: BannersInicio }> {
  const [productos, bannersActivos] = await Promise.all([
    listarProductosPublicosFiltrados({ tipo: "home" }),
    listarBannersActivos(),
  ]);

  // Novedades de la semana (D-58): las más recientes primero, máximo 8.
  const ahora = Date.now();
  const novedades = productos
    .filter((p) => esNovedad(p, ahora))
    .sort((a, b) => (b.nuevoHasta ?? "").localeCompare(a.nuevoHasta ?? ""))
    .slice(0, 8);
  const idsNovedades = new Set(novedades.map((p) => p._id));

  // Los marcados para el inicio, por "ordenHome" (sin valor, al final). Las novedades no se repiten.
  const products = productos
    .filter((p) => p.mostrarEnHome === true && !idsNovedades.has(p._id))
    .sort((a, b) => (a.ordenHome ?? Infinity) - (b.ordenHome ?? Infinity));

  // Banners del inicio (ubicación ""), el primero activo de cada posición.
  const delInicio = bannersActivos.filter((b) => Array.isArray(b.ubicaciones) && b.ubicaciones.includes(""));
  const banners: BannersInicio = {};
  for (const posicion of POSICIONES) {
    const banner = delInicio.find((b) => b.posicion === posicion && b.activo);
    if (banner) banners[posicion] = banner;
  }

  return { novedades: novedades.map(paraTarjeta), products: products.map(paraTarjeta), banners };
}

export default async function Home() {
  const { novedades, products, banners } = await cargarInicio();
  return (
    <main className="w-full">
                <Header />
                <HomeProducts novedades={novedades} products={products} banners={banners} />
                <InfoSection />
                <BenefitsSection />
    </main>
  );
}
