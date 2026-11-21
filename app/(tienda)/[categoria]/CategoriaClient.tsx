"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "@/Components/ProductCard/ProductCard";
import type { Product, Banner, Category } from "@/types";

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
type StockFilter = "all" | "Disponible" | "Limitado";
type Enlace = { slug: string; nombre: string };

function BannerLarge({ banner }: { banner: Banner }) {
  const content = (
    <div className="w-full rounded-md overflow-hidden relative mb-4 md:mb-6">
      <Image
        src={banner.imagenUrl}
        alt={banner.titulo}
        width={1920}
        height={1080}
        className="w-full h-auto object-contain"
        priority
        sizes="100vw"
      />
    </div>
  );

  if (banner.enlace) {
    return <Link href={banner.enlace}>{content}</Link>;
  }

  return content;
}

// Fase 24: la página (servidor) carga la categoría, sus productos ya ordenados y sus banners;
// aquí solo quedan el orden y los filtros que elige el cliente. Mismo aspecto que antes (N1-1).
export default function CategoriaClient({
  category,
  products,
  banners,
  subcategorias = [],
  madre = null,
}: {
  category: Category | null;
  products: Product[];
  banners: Banner[];
  /** Fase 25 (D-88): hijas activas; vacío = la página se ve igual que antes. */
  subcategorias?: Enlace[];
  /** Si esta categoría es una subcategoría, su madre (para la ruta «Hogar › Cocina»). */
  madre?: Enlace | null;
}) {
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // Aplicar filtros y ordenamiento — valor derivado, se recalcula en el render.
  // Cuando sortBy === "default", se conserva el orden manual ya aplicado
  // arriba (ordenPorCategoria). Si el usuario elige precio o nombre, eso
  // tiene prioridad sobre el orden manual, como es esperable.
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (stockFilter !== "all") {
      result = result.filter(p => p.stock === stockFilter);
    }

    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.precio - b.precio);
        break;
      case "price-desc":
        result.sort((a, b) => b.precio - a.precio);
        break;
      case "name-asc":
        result.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case "name-desc":
        result.sort((a, b) => b.nombre.localeCompare(a.nombre));
        break;
      default:
        // Mantiene el orden manual por categoría ya aplicado en products
        break;
    }

    return result;
  }, [products, sortBy, stockFilter]);

  if (!category) {
    return (
      <section className="w-full max-w-[1000px] mx-auto pb-10 px-4">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Categoría no encontrada</h1>
          <Link href="/" className="text-indigo-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[1000px] mx-auto pb-10 select-none px-2 md:px-4 pt-4 md:pt-6">
      
      {/* Header de categoría con filtros */}
      <div className="mb-6">
        {madre && (
          <nav aria-label="Ruta" className="text-sm text-gray-500 mb-1">
            <Link href={`/${madre.slug}`} className="hover:text-indigo-600 hover:underline">
              {madre.nombre}
            </Link>
            <span className="mx-1.5" aria-hidden="true">›</span>
            <span className="text-gray-700">{category.nombre}</span>
          </nav>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{category.nombre}</h1>
        {category.descripcion && (
          <p className="text-gray-600 text-sm md:text-base mb-4">{category.descripcion}</p>
        )}
        
        {subcategorias.length > 0 && (
          <nav aria-label="Subcategorías" className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            <span className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-600 text-white" aria-current="page">
              Todo
            </span>
            {subcategorias.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:border-indigo-600 hover:text-indigo-600 transition"
              >
                {s.nombre}
              </Link>
            ))}
          </nav>
        )}

        {/* Barra de filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            {/* Contador de productos */}
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredProducts.length}</span> productos encontrados
            </div>

            {/* Controles de filtro */}
            <div className="flex flex-wrap gap-2 md:gap-3">
              {/* Filtro por stock */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                className="flex-1 md:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="all">Todos los stocks</option>
                <option value="Disponible">✅ Disponible</option>
                <option value="Limitado">⚠️ Limitado</option>
              </select>

              {/* Ordenar por */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex-1 md:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="default">Orden de la tienda</option>
                <option value="price-asc">💰 Precio: Menor a Mayor</option>
                <option value="price-desc">💰 Precio: Mayor a Menor</option>
                <option value="name-asc">🔤 Nombre: A - Z</option>
                <option value="name-desc">🔤 Nombre: Z - A</option>
              </select>

              {/* Botón reset (solo visible si hay filtros activos) */}
              {(sortBy !== "default" || stockFilter !== "all") && (
                <button
                  onClick={() => {
                    setSortBy("default");
                    setStockFilter("all");
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banner principal superior */}
      {banners.length > 0 && banners[0] && (
        <BannerLarge banner={banners[0]} />
      )}

      {/* Grid de productos filtrados */}
      {filteredProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
            {filteredProducts.slice(0, 4).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          {banners.length > 1 && banners[1] && (
            <BannerLarge banner={banners[1]} />
          )}

          {filteredProducts.length > 4 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
              {filteredProducts.slice(4, 8).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          {banners.length > 2 && banners[2] && (
            <BannerLarge banner={banners[2]} />
          )}

          {filteredProducts.length > 8 && (
            <>
              {Array.from({ length: Math.ceil((filteredProducts.length - 8) / 4) }).map((_, groupIndex) => {
                const startIndex = 8 + (groupIndex * 4);
                const endIndex = startIndex + 4;
                const groupProducts = filteredProducts.slice(startIndex, endIndex);
                
                return (
                  <div key={`group-${groupIndex}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                      {groupProducts.map((p) => (
                        <ProductCard key={p._id} product={p} />
                      ))}
                    </div>
                    
                    {banners.length > (3 + groupIndex) && banners[3 + groupIndex] && (
                      <BannerLarge banner={banners[3 + groupIndex]} />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-xl">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No hay productos con estos filtros</h3>
          <p className="text-gray-600 mb-4">Intenta cambiar los filtros de búsqueda</p>
          <button
            onClick={() => {
              setSortBy("default");
              setStockFilter("all");
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  );
}