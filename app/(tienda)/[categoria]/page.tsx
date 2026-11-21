import type { Metadata } from "next";
import { cache } from "react";
import { listarCategorias } from "@/server/services/category.service";
import { listarBannersActivos } from "@/server/services/banner.service";
import { listarProductosPublicosFiltrados } from "@/server/services/product.service";
import CategoriaClient from "./CategoriaClient";

// Fase 24: la categoría se resuelve en el servidor. Antes el navegador descargaba el catálogo entero,
// todas las categorías y todos los banners y filtraba; ahora solo viaja lo de esta categoría y Google
// ve los productos en el HTML. Se genera en cada visita, así los cambios del panel se ven al instante.

type Props = { params: Promise<{ categoria: string }> };

/** Una sola consulta por visita aunque la usen la página y los metadatos. */
const cargarCategoria = cache(async (slug: string) => {
  const categorias = await listarCategorias();
  // Misma regla que antes: se busca entre todas las categorías por su slug.
  const category = categorias.find((c) => c.slug === slug) ?? null;
  if (!category) return { category: null, products: [], banners: [] };

  const [productos, bannersActivos] = await Promise.all([
    listarProductosPublicosFiltrados({ tipo: "categoria", slug }),
    listarBannersActivos(),
  ]);
  // Orden manual de ESTA categoría; los que no tienen valor quedan al final (igual que antes).
  const products = [...productos].sort(
    (a, b) => (a.ordenPorCategoria?.[slug] ?? Infinity) - (b.ordenPorCategoria?.[slug] ?? Infinity),
  );
  const banners = bannersActivos.filter((b) => b.ubicaciones && b.ubicaciones.includes(slug) && b.activo);
  return { category, products, banners };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const { category } = await cargarCategoria(categoria);
  if (!category) return { title: "Categoría no encontrada" };
  const descripcion = category.descripcion || `Compra ${category.nombre} en Janku, tienda online en Huancayo.`;
  return {
    title: category.nombre,
    description: descripcion,
    openGraph: { title: category.nombre, description: descripcion, type: "website" },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  const { category, products, banners } = await cargarCategoria(categoria);
  return <CategoriaClient category={category} products={products} banners={banners} />;
}
