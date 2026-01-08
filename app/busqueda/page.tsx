"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/Components/ProductCard/ProductCard";
import { fetchWithCache } from "@/lib/cache";

type Product = {
  _id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  categoria?: string;
  categoriaSlug?: string;
  stock?: "Disponible" | "Limitado" | "Agotado";
  imagenUrl?: string;
  slug?: string;
  deliveryHuancayo?: boolean;
  imagenesAdicionales?: string[];
};

type Category = {
  _id: string;
  nombre: string;
  slug: string;
  activo: boolean;
};

type SortOption = "default" | "price-asc" | "price-desc" | "name-asc";

// ✅ Componente que usa useSearchParams envuelto en Suspense
function BusquedaContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [stockFilter, setStockFilter] = useState<string>("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          fetchWithCache<Product[]>("/api/products"),
          fetchWithCache<Category[]>("/api/categories")
        ]);

        setProducts(productsData);
        setCategories(categoriesData.filter(c => c.activo));
        setLoading(false);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Aplicar búsqueda y filtros
  useEffect(() => {
    let result = [...products];

    // Búsqueda por texto
    if (query) {
      const searchTerm = query.toLowerCase();
      result = result.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm) ||
        p.descripcion?.toLowerCase().includes(searchTerm) ||
        p.categoria?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== "all") {
      result = result.filter(p => p.categoriaSlug === selectedCategory);
    }

    // Filtrar por rango de precio
    result = result.filter(p => p.precio >= priceRange[0] && p.precio <= priceRange[1]);

    // Filtrar por stock
    if (stockFilter !== "all") {
      result = result.filter(p => p.stock === stockFilter);
    }

    // Ordenar
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
    }

    setFilteredProducts(result);
  }, [products, query, selectedCategory, priceRange, stockFilter, sortBy]);

  const hasActiveFilters = selectedCategory !== "all" || 
                          priceRange[0] !== 0 || 
                          priceRange[1] !== 10000 || 
                          stockFilter !== "all" ||
                          sortBy !== "default";

  const clearFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, 10000]);
    setStockFilter("all");
    setSortBy("default");
  };

  if (loading) {
    return (
      <section className="w-full max-w-[1200px] mx-auto px-4 py-8">
        <div className="h-12 bg-gray-300 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-300 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[1000px] mx-auto px-2 md:px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Resultados de búsqueda
        </h1>
        {query && (
          <p className="text-sm md:text-base text-gray-600">
            Mostrando resultados para: <span className="font-semibold">"{query}"</span>
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-500">
            {filteredProducts.length} productos encontrados
          </p>
          
          {/* Botón de filtros para móvil */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de filtros */}
        <aside className={`
          lg:w-64 flex-shrink-0
          lg:block
          ${showFilters ? 'block' : 'hidden'}
        `}>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Filtros
              </h2>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:underline flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Ordenar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="default">Relevancia</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="name-asc">A - Z</option>
                </select>
              </div>

              {/* Categorías */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value="all"
                      checked={selectedCategory === "all"}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Todas</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat._id} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={cat.slug}
                        checked={selectedCategory === cat.slug}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{cat.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rango de precio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Min"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Max"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    S/ {priceRange[0]} - S/ {priceRange[1]}
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disponibilidad
                </label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Limitado">Limitado</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="lg:hidden w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition"
            >
              Ver resultados
            </button>
          </div>
        </aside>

        {/* Grid de productos */}
        <main className="flex-1 min-w-0">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-xl">
              <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                No se encontraron productos
              </h3>
              <p className="text-gray-600 mb-6">
                {query 
                  ? `No hay resultados para "${query}" con los filtros seleccionados`
                  : "Intenta ajustar los filtros de búsqueda"
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  Limpiar filtros
                </button>
              )}
              <Link
                href="/"
                className="block mt-4 text-indigo-600 hover:underline"
              >
                Volver al inicio
              </Link>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

// ✅ Componente principal con Suspense
export default function BusquedaPage() {
  return (
    <Suspense fallback={
      <section className="w-full max-w-[1200px] mx-auto px-4 py-8">
        <div className="h-12 bg-gray-300 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-300 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    }>
      <BusquedaContent />
    </Suspense>
  );
}