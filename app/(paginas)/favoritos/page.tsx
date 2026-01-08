"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import { useState } from "react";

export default function FavoritosPage() {
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();
  const { addToCart } = useCart();
  const [showAddedMessage, setShowAddedMessage] = useState<string | null>(null);

  const handleAddToCart = (favorite: any) => {
    addToCart(favorite);
    setShowAddedMessage(favorite._id);
    setTimeout(() => setShowAddedMessage(null), 2000);
  };

  if (favorites.length === 0) {
    return (
      <section className="w-full max-w-[1000px] mx-auto px-4 py-16">
        <div className="text-center">
          <div className="mb-6">
            <Heart className="w-24 h-24 text-gray-300 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            No tienes favoritos aún
          </h1>
          <p className="text-gray-600 mb-8">
            Agrega productos a tus favoritos para verlos más tarde
          </p>
          <Link
            href="/"
            className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition"
          >
            Explorar Productos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[1000px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500" fill="currentColor" />
            Mis Favoritos
          </h1>
          <p className="text-gray-600 mt-2">
            {favorites.length} {favorites.length === 1 ? "producto" : "productos"} guardados
          </p>
        </div>
        
        {favorites.length > 0 && (
          <button
            onClick={() => {
              if (confirm("¿Eliminar todos los favoritos?")) {
                clearFavorites();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar todo
          </button>
        )}
      </div>

      {/* Grid de productos favoritos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {favorites.map((product) => (
          <div
            key={product._id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group relative"
          >
            <Link href={`/producto/${product.slug || product._id}`}>
              <div className="aspect-square relative bg-gray-200">
                {product.imagenUrl && (
                  <Image
                    src={product.imagenUrl}
                    alt={product.nombre}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>

              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
                  {product.nombre}
                </h3>
                <p className="text-xl font-bold text-indigo-600">
                  S/ {product.precio.toFixed(2)}
                </p>
              </div>
            </Link>

            {/* Botones de acción */}
            <div className="p-4 pt-0 flex gap-2">
              <button
                onClick={() => handleAddToCart(product)}
                className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm font-medium"
              >
                <ShoppingCart className="w-4 h-4" />
                {showAddedMessage === product._id ? "¡Agregado!" : "Agregar"}
              </button>
              
              <button
                onClick={() => removeFromFavorites(product._id)}
                className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition"
                title="Quitar de favoritos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Banner inferior */}
      <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">
          ¿Listo para comprar?
        </h2>
        <p className="mb-6 opacity-90">
          Todos tus productos favoritos están esperándote
        </p>
        <Link
          href="/"
          className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition"
        >
          Seguir Comprando
        </Link>
      </div>
    </section>
  );
}