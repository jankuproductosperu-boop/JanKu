"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShoppingCart, Minus, Plus, ArrowLeft, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";

type Promotion = {
  _id: string;
  titulo: string;
  descripcion?: string;
  descripcionCompleta?: string;
  precio: number;
  precioAnterior?: number;
  imagenUrl: string;
  imagenesAdicionales?: string[];
  tipoEtiqueta: "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo";
  stock: "Disponible" | "Limitado" | "Agotado";
  caracteristicas?: string[];
  whatsappLink?: string;
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
};

export default function PromocionPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [promotionIndex, setPromotionIndex] = useState(0);
  
  const { addToCart, toggleCart } = useCart();

  useEffect(() => {
    const loadPromotion = async () => {
      try {
        // Primero obtenemos todas las promociones para saber el índice
        const allRes = await fetch("/api/promotions");
        const allPromotions = await allRes.json();
        const index = allPromotions.findIndex((p: Promotion) => p._id === id);
        setPromotionIndex(index !== -1 ? index : 0);

        // Luego obtenemos la promoción específica
        const res = await fetch(`/api/promotions/${id}`);
        const data = await res.json();
        setPromotion(data);
        setSelectedImage(data.imagenUrl || "");
        setLoading(false);

        if (data) {
          document.title = data.metaTitulo || data.titulo;
        }
      } catch (err) {
        console.error("Error cargando promoción:", err);
        setLoading(false);
      }
    };

    loadPromotion();
  }, [id]);

  const getStockColor = (stock?: string) => {
    switch (stock) {
      case "Disponible":
        return "bg-green-500 text-white";
      case "Limitado":
        return "bg-yellow-500 text-white";
      case "Agotado":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStockIcon = (stock?: string) => {
    switch (stock) {
      case "Disponible":
        return "✅";
      case "Limitado":
        return "⚠️";
      case "Agotado":
        return "❌";
      default:
        return "";
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

  const handleAddToCart = () => {
    if (!promotion || promotion.stock === "Agotado") return;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        _id: promotion._id,
        nombre: `Promoción ${promotionIndex + 1}`,
        precio: promotion.precio,
        imagenUrl: promotion.imagenUrl,
        slug: promotion._id,
      });
    }

    setShowAddedMessage(true);
    setTimeout(() => {
      setShowAddedMessage(false);
      toggleCart();
    }, 1500);
  };

  if (loading) {
    return (
      <section className="w-full max-w-[1000px] mx-auto pb-10 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="aspect-square bg-gray-300 rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-300 rounded animate-pulse" />
            <div className="h-12 bg-gray-300 rounded animate-pulse" />
            <div className="h-24 bg-gray-300 rounded animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (!promotion) {
    return (
      <section className="w-full max-w-[1000px] mx-auto pb-10 px-4">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Promoción no encontrada</h1>
          <Link href="/promociones" className="text-[#2C2C6C] hover:underline">
            Ver todas las promociones
          </Link>
        </div>
      </section>
    );
  }

  const allImages = [promotion.imagenUrl, ...(promotion.imagenesAdicionales || [])].filter(Boolean);
  const descuento = promotion.precioAnterior 
    ? Math.round(((promotion.precioAnterior - promotion.precio) / promotion.precioAnterior) * 100)
    : 0;

  return (
    <section className="w-full max-w-[1000px] mx-auto pb-10 px-4 pt-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-[#2C2C6C]">Inicio</Link>
        <span>/</span>
        <Link href="/promociones" className="hover:text-[#2C2C6C]">Promociones</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Promoción {promotionIndex + 1}</span>
      </nav>

      {/* Mensaje flotante de confirmación */}
      {showAddedMessage && (
        <div className="fixed top-20 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="text-3xl">✓</div>
            <div>
              <p className="font-bold">¡Agregado al carrito!</p>
              <p className="text-sm opacity-90">Abriendo carrito...</p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Galería de imágenes */}
        <div className="space-y-4">
          <div className="aspect-square w-full rounded-xl overflow-hidden relative bg-gray-200 shadow-lg">
            {selectedImage && (
              <Image 
                src={selectedImage} 
                alt={promotion.titulo} 
                fill 
                className="object-cover" 
                priority
              />
            )}
            
            {/* Etiqueta flotante */}
            <div className={`absolute top-4 right-4 ${getEtiquetaColor(promotion.tipoEtiqueta)} text-white px-4 py-2 rounded-full font-bold shadow-lg animate-pulse`}>
              ¡{promotion.tipoEtiqueta}!
            </div>
          </div>

          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img || "")}
                  className={`aspect-square rounded-lg overflow-hidden relative bg-gray-200 border-2 transition ${
                    selectedImage === img ? "border-[#241B57]" : "border-transparent hover:border-gray-400"
                  }`}
                >
                  <Image 
                    src={img || ""} 
                    alt={`${promotion.titulo} - imagen ${idx + 1}`} 
                    fill 
                    className="object-cover" 
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información de la promoción */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-[#241B57]" />
              <span className="text-[#241B57] font-bold">PROMOCIÓN ESPECIAL</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
              {promotion.titulo}
            </h1>
          </div>

          {/* Precio */}
          <div className="border-t border-b py-4">
            <div className="flex items-center gap-3 mb-2">
              {promotion.precioAnterior && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    S/ {promotion.precioAnterior.toFixed(2)}
                  </span>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    -{descuento}%
                  </span>
                </>
              )}
            </div>
            <p className="text-4xl font-bold text-[#241B57]">
              S/ {promotion.precio.toFixed(2)}
            </p>
          </div>

          {/* Stock */}
          {promotion.stock && (
            <div className="flex items-center gap-2">
              <span className="text-lg">Stock:</span>
              <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${getStockColor(promotion.stock)}`}>
                {getStockIcon(promotion.stock)} {promotion.stock}
              </span>
            </div>
          )}

          {/* Descripción corta */}
          {promotion.descripcion && (
            <div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Descripción</h3>
              <p className="text-gray-700 leading-relaxed">{promotion.descripcion}</p>
            </div>
          )}

          {/* Selector de cantidad */}
          {promotion.stock !== "Agotado" && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad:
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-12 h-12 rounded-lg flex items-center justify-center transition"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border-2 border-gray-300 rounded-lg font-bold text-xl focus:border-[#2C2C6C] outline-none py-3"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-[#2C2C6C] hover:bg-[#241B57] text-white w-12 h-12 rounded-lg flex items-center justify-center transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3 pt-4">
            {promotion.stock !== "Agotado" && (
              <>
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-[#241B57] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#1a1442] transition shadow-lg flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-6 h-6" />
                  Agregar al Carrito ({quantity})
                </button>
                
                {promotion.whatsappLink ? (
                  <a 
                    href={promotion.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Consultar por WhatsApp
                  </a>
                ) : (
                  <button className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Consultar por WhatsApp
                  </button>
                )}
              </>
            )}
            
            {promotion.stock === "Agotado" && (
              <div className="w-full bg-gray-300 text-gray-600 py-4 rounded-lg font-bold text-lg text-center cursor-not-allowed">
                Promoción Agotada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descripción completa */}
      {promotion.descripcionCompleta && (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Detalles de la Promoción</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {promotion.descripcionCompleta}
          </p>
        </div>
      )}

      {/* Características */}
      {promotion.caracteristicas && promotion.caracteristicas.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Lo que Incluye</h2>
          <ul className="space-y-3">
            {promotion.caracteristicas.map((carac, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-[#241B57] text-xl mt-1">✓</span>
                <span className="text-gray-700">{carac}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botón volver */}
      <div className="text-center">
        <Link
          href="/promociones"
          className="inline-flex items-center gap-2 text-[#2C2C6C] hover:text-[#241B57] font-medium transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Ver más promociones
        </Link>
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </section>
  );
}