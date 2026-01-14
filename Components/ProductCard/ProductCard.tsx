"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";

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

type ProductCardProps = {
  product: Product;
  showAddToCart?: boolean;
  compact?: boolean;
  className?: string;
};

export default function ProductCard({ 
  product, 
  showAddToCart = true,
  compact = false,
  className = ""
}: ProductCardProps) {
  const [currentImage, setCurrentImage] = useState(product.imagenUrl || "");
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [showFavoriteMessage, setShowFavoriteMessage] = useState(false);
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  
  const isProductFavorite = isFavorite(product._id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock === "Agotado") {
      setShowStockAlert(true);
      setTimeout(() => setShowStockAlert(false), 3000);
      return;
    }

    addToCart({
      _id: product._id,
      nombre: product.nombre,
      precio: product.precio,
      imagenUrl: product.imagenUrl,
      slug: product.slug,
    });

    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 2000);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProductFavorite) {
      removeFromFavorites(product._id);
    } else {
      addToFavorites({
        _id: product._id,
        nombre: product.nombre,
        precio: product.precio,
        imagenUrl: product.imagenUrl,
        slug: product.slug,
      });
      setShowFavoriteMessage(true);
      setTimeout(() => setShowFavoriteMessage(false), 2000);
    }
  };

  const getStockColor = (stock?: string) => {
    switch (stock) {
      case "Disponible":
        return "bg-green-500";
      case "Limitado":
        return "bg-yellow-500";
      case "Agotado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Link 
      href={`/producto/${product.slug || product._id}`} 
      className={`block transition-all duration-300 hover:scale-[1.02] hover:shadow-lg rounded-md group ${className}`}
      onMouseEnter={() => {
        if (product.imagenesAdicionales && product.imagenesAdicionales.length > 0) {
          setCurrentImage(product.imagenesAdicionales[0]);
        }
      }}
      onMouseLeave={() => {
        setCurrentImage(product.imagenUrl || "");
      }}
    >
      <div className={`w-full rounded-md overflow-hidden relative bg-gray-200 ${compact ? 'aspect-[4/3]' : 'aspect-square'}`}>
        {currentImage && (
          <Image 
            src={currentImage} 
            alt={product.nombre} 
            fill 
            className="object-cover" 
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          />
        )}
        
        {/* Badge de Stock */}
        {product.stock && (
          <div className={`absolute ${compact ? 'top-1 right-1 text-[10px] px-1.5 py-0.5' : 'top-2 right-2 text-xs px-2 py-1'} ${getStockColor(product.stock)} text-white rounded-full font-semibold z-10`}>
            {product.stock}
          </div>
        )}

        {/* Botón de favoritos */}
        <button
          onClick={handleToggleFavorite}
          className={`absolute ${compact ? 'top-1 left-1 p-1.5' : 'top-2 left-2 p-2'} bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all duration-300 z-10 hover:scale-110 ${
            isProductFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          }`}
          title={isProductFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart 
            className={compact ? 'w-3 h-3' : 'w-4 h-4'} 
            fill={isProductFavorite ? "currentColor" : "none"}
          />   
        </button>

        {/* Botón de carrito */}
        {showAddToCart && product.stock !== "Agotado" && (
          <button
            onClick={handleAddToCart}
            className={`absolute ${compact ? 'bottom-1 right-1 p-1.5' : 'bottom-2 right-2 p-2'} bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-110 z-10`}
            title="Agregar al carrito"
          >
            <ShoppingCart className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </button>
        )}

        {/* Mensaje de confirmación */}
        {showAddedMessage && (
          <div className="absolute inset-0 bg-green-600/90 flex items-center justify-center z-20 animate-fade-in">
            <div className="text-white text-center">
              <div className={compact ? 'text-2xl mb-1' : 'text-3xl mb-1'}>✓</div>
              <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>¡Agregado al carrito!</p>
            </div>
          </div>
        )}

        {/* Mensaje de favorito agregado */}
        {showFavoriteMessage && (
          <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center z-20 animate-fade-in">
            <div className="text-white text-center">
              <div className={compact ? 'text-2xl mb-1' : 'text-3xl mb-1'}>❤️</div>
              <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>¡Agregado a favoritos!</p>
            </div>
          </div>
        )}

        {/* Alerta de producto agotado */}
        {showStockAlert && (
          <div className="absolute inset-0 bg-red-600/95 flex items-center justify-center z-20 animate-fade-in">
            <div className="text-white text-center px-4">
              <div className={compact ? 'text-2xl mb-1' : 'text-3xl mb-1'}>⚠️</div>
              <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>Producto Agotado</p>
              <p className={`${compact ? 'text-[10px]' : 'text-xs'} mt-1`}>No disponible</p>
            </div>
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className={compact ? 'mt-1' : 'mt-2'}>
        <h3 className={`text-gray-700 line-clamp-2 font-medium ${compact ? 'text-[10px] leading-tight' : 'text-xs md:text-sm'}`}>
          {product.nombre}
        </h3>
        
        <p className={`font-bold text-gray-900 ${compact ? 'text-sm mt-0.5' : 'text-base md:text-lg mt-1'}`}>
          S/ {product.precio.toFixed(2)}
        </p>
        
        {/* Delivery gratis */}
        {product.deliveryHuancayo && !compact && (
          <div className="flex items-center gap-1 mt-1">
            <svg 
              className="w-3 h-3 md:w-4 md:h-4 text-green-600" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
            </svg>
            <span className="text-[10px] md:text-xs text-green-600 font-medium">
              Delivery gratis
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </Link>
  );
}