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

  return { novedades, products, banners };
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
