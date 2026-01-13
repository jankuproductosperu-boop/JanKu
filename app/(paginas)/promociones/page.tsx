"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";

type Promotion = {
  _id: string;
  titulo: string;
  descripcion?: string;
  precio: number;
  precioAnterior?: number;
  imagenUrl: string;
  imagenesAdicionales?: string[];
  tipoEtiqueta: "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo";
  stock: "Disponible" | "Limitado" | "Agotado";
  activo: boolean;
  orden: number;
};

export default function PromocionesPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promotions")
      .then((res) => res.json())
      .then((data) => {
        setPromotions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando promociones:", err);
        setLoading(false);
      });
  }, []);

  const getStockColor = (stock: string) => {
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

  const getEtiquetaColor = (tipo: string) => {
    switch (tipo) {
      case "Combo":
        return "bg-gradient-to-r from-red-500 to-red-600";
      case "2x1":
        return "bg-gradient-to-r from-orange-500 to-orange-600";
      case "Descuento":
        return "bg-gradient-to-r from-purple-500 to-purple-600";
      case "Oferta":
        return "bg-gradient-to-r from-pink-500 to-pink-600";
      case "Nuevo":
        return "bg-gradient-to-r from-blue-500 to-blue-600";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  if (loading) {
    return (
      <section className="w-full max-w-[1000px] mx-auto px-2 md:px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-300 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const PromotionCard = ({ promotion, index }: { promotion: Promotion; index: number }) => {
    const [currentImage, setCurrentImage] = useState(promotion.imagenUrl);
    const [isHovered, setIsHovered] = useState(false);
    const [showAddedMessage, setShowAddedMessage] = useState(false);
    const { addToCart } = useCart();

    const handleAddToCart = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (promotion.stock === "Agotado") return;

      addToCart({
        _id: promotion._id,
        nombre: `Promoción ${index + 1}`,
        precio: promotion.precio,
        imagenUrl: promotion.imagenUrl,
        slug: promotion._id,
      });

      setShowAddedMessage(true);
      setTimeout(() => setShowAddedMessage(false), 2000);
    };

    // Calcular porcentaje de descuento
    const discountPercentage = promotion.precioAnterior 
      ? Math.round(((promotion.precioAnterior - promotion.precio) / promotion.precioAnterior) * 100)
      : 0;

return (
  <div
    className="relative group"
    onMouseEnter={() => {
      setIsHovered(true);
      if (promotion.imagenesAdicionales && promotion.imagenesAdicionales.length > 0) {
        setCurrentImage(promotion.imagenesAdicionales[0]);
      }
    }}
    onMouseLeave={() => {
      setIsHovered(false);
      setCurrentImage(promotion.imagenUrl);
    }}
  >
    <Link
      href={`/promocion/${promotion._id}`}
      className="block bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] border border-gray-100"
    >
      {/* Imagen con badges */}
      <div className="relative">
        {/* Etiqueta tipo de promoción - ARRIBA DERECHA */}
        <div className={`absolute top-3 right-3 ${getEtiquetaColor(promotion.tipoEtiqueta)} text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xl z-10`}>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {promotion.tipoEtiqueta}
          </span>
        </div>

        {/* Badge de descuento - ARRIBA IZQUIERDA */}
        {discountPercentage > 0 && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xl z-10">
            -{discountPercentage}%
          </div>
        )}

        {/* Imagen */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 overflow-hidden">
          {currentImage && (
            <Image
              src={currentImage}
              alt={promotion.titulo}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          )}
          
          {/* Overlay gradiente sutil en hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badge de stock - ABAJO IZQUIERDA */}
          <div className={`absolute bottom-3 left-3 ${getStockColor(promotion.stock)} text-white text-xs px-3 py-1.5 rounded-xl font-semibold shadow-lg z-10`}>
            {promotion.stock}
          </div>

          {/* Botón carrito - ABAJO DERECHA */}
          {promotion.stock !== "Agotado" && (
            <button
              onClick={handleAddToCart}
              className={`absolute bottom-3 right-3 bg-gradient-to-r from-[#241B57] to-[#2C2C6C] hover:from-[#1a1442] hover:to-[#241B57] text-white p-2.5 rounded-xl shadow-xl transition-all duration-300 z-10
                ${isHovered ? 'opacity-100 scale-100' : 'opacity-100 md:opacity-0 md:scale-95'} 
                hover:scale-110 hover:rotate-6`}
              title="Agregar al carrito"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}

          {/* Mensaje de confirmación */}
          {showAddedMessage && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center z-30 backdrop-blur-sm">
              <div className="text-white text-center animate-bounce">
                <div className="text-4xl mb-2">✓</div>
                <p className="font-bold text-sm">¡Agregado!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido de la tarjeta */}
      <div className="p-4 bg-gradient-to-br from-white to-gray-50">
        <h3 className="font-bold text-gray-900 text-sm lg:text-base mb-2 line-clamp-2 min-h-[2.5rem] leading-tight group-hover:text-[#241B57] transition-colors">
          {promotion.titulo}
        </h3>

        {promotion.descripcion && (
          <p className="text-gray-600 text-xs mb-3 line-clamp-2 leading-relaxed">
            {promotion.descripcion}
          </p>
        )}

        {/* Sección de precio - MEJORADA */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 mb-3">
          {promotion.precioAnterior && (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-400 line-through text-xs">
                S/ {promotion.precioAnterior.toFixed(2)}
              </span>
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                AHORRA S/ {(promotion.precioAnterior - promotion.precio).toFixed(2)}
              </span>
            </div>
          )}
          <div className="text-[#241B57] font-black text-2xl lg:text-3xl leading-none">
            S/ {promotion.precio.toFixed(2)}
          </div>
        </div>

        {/* Botón de acción */}
        <button className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-amber-600 text-gray-900 font-bold py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-xs lg:text-sm">
          Ver detalles de la oferta
        </button>
      </div>
    </Link>
  </div>
);
  };

  return (
    <section className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1000px] mx-auto px-2 md:px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-[#241B57]" />
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">
              Combos y Ofertas del Mes
            </h1>
            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-[#241B57]" />
          </div>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
            ¡Aprovecha nuestras promociones exclusivas! Ofertas limitadas en productos seleccionados.
          </p>
        </div>

        {/* Grid de promociones */}
        {promotions.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              No hay promociones activas
            </h2>
            <p className="text-gray-600 mb-8">
              ¡Vuelve pronto para ver nuestras ofertas!
            </p>
            <Link
              href="/"
              className="inline-block bg-[#2C2C6C] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#241B57] transition"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {promotions.map((promo, index) => (
              <PromotionCard key={promo._id} promotion={promo} index={index} />
            ))}
          </div>
        )}

        {/* Banner inferior (opcional) */}
        <div className="mt-12 bg-gradient-to-r from-[#2C2C6C] to-[#241B57] rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Tienes alguna duda?
          </h2>
          <p className="mb-6 text-gray-200">
            Contáctanos por WhatsApp para más información sobre nuestras promociones
          </p>
          <a
            href="https://wa.me/51978339737"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Contáctanos
          </a>
        </div>
      </div>
    </section>
  );
}