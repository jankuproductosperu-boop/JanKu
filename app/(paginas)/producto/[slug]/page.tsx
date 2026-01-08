"use client";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShoppingCart, Minus, Plus, Play } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { fetchWithCache } from "@/lib/cache";
import ProductCard from "@/Components/ProductCard/ProductCard";

type Product = {
  _id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  descripcionCompleta?: string;
  categoria?: string;
  categoriaSlug?: string;
  stock?: "Disponible" | "Limitado" | "Agotado";
  imagenUrl?: string;
  imagenesAdicionales?: string[];
  videoUrl?: string; // ✅ AGREGADO
  slug?: string;
  deliveryHuancayo?: boolean;
  caracteristicas?: string[];
  whatsappLink?: string;
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
};

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [showingVideo, setShowingVideo] = useState(false); // ✅ AGREGADO
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const { addToCart, toggleCart } = useCart();
  // ✅ Función para extraer el ID del video de YouTube
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const loadProduct = async () => {
      try {
        // ✅ Usar caché para productos
        const allProducts = await fetchWithCache<Product[]>("/api/products");
        
        const found = allProducts.find(
          (p: Product) => p.slug === slug || p._id === slug
        );
        
        setProduct(found || null);
        setSelectedImage(found?.imagenUrl || "");
        setLoading(false);

        if (found) {
          document.title = found.metaTitulo || found.nombre;
        }
      } catch (err) {
        console.error("Error cargando producto:", err);
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  useEffect(() => {
  const loadRelatedProducts = async () => {
    if (!product) return;

    try {
      const allProducts = await fetchWithCache<Product[]>("/api/products");
      
      // Filtrar productos relacionados
      let related = allProducts.filter(p => 
        p._id !== product._id && // No incluir el producto actual
        (
          p.categoriaSlug === product.categoriaSlug || // Misma categoría
          p.categoria === product.categoria
        )
      );

      // Limitar a 8 productos
      related = related.slice(0, 8);
      
      setRelatedProducts(related);
    } catch (error) {
      console.error("Error cargando productos relacionados:", error);
    }
  };

  loadRelatedProducts();
}, [product]);

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

  const handleAddToCart = () => {
    if (!product || product.stock === "Agotado") return;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        _id: product._id,
        nombre: product.nombre,
        precio: product.precio,
        imagenUrl: product.imagenUrl,
        slug: product.slug,
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

  if (!product) {
    return (
      <section className="w-full max-w-[1000px] mx-auto pb-10 px-4">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Producto no encontrado</h1>
          <Link href="/" className="text-indigo-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </section>
    );
  }

  const allImages = [product.imagenUrl, ...(product.imagenesAdicionales || [])].filter(Boolean);
  
  // ✅ Obtener ID del video de YouTube si existe
  const videoId = product.videoUrl ? getYouTubeVideoId(product.videoUrl) : null;

  return (
    <section className="w-full max-w-[1000px] mx-auto pb-10 px-4 pt-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-indigo-600">Inicio</Link>
        {product.categoria && product.categoriaSlug && (
          <>
            <span>/</span>
            <Link href={`/${product.categoriaSlug}`} className="hover:text-indigo-600">
              {product.categoria}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-800 font-medium">{product.nombre}</span>
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
        {/* Galería de imágenes y video */}
        <div className="space-y-4">
          {/* ✅ Imagen/Video principal grande */}
          <div className="aspect-square w-full rounded-xl overflow-hidden relative bg-gray-200 shadow-lg">
            {showingVideo && videoId ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0"
              />
            ) : (
              selectedImage && (
                <Image 
                  src={selectedImage} 
                  alt={product.nombre} 
                  fill 
                  className="object-cover" 
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw" 
                />
              )
            )}
          </div>

          {/* ✅ Miniaturas (imágenes + video) */}
          {(allImages.length > 1 || videoId) && (
            <div className="grid grid-cols-4 gap-2">
              {/* Miniaturas de imágenes */}
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedImage(img || "");
                    setShowingVideo(false);
                  }}
                  className={`aspect-square rounded-lg overflow-hidden relative bg-gray-200 border-2 transition ${
                    selectedImage === img && !showingVideo ? "border-indigo-600" : "border-transparent hover:border-gray-400"
                  }`}
                >
                  <Image 
                    src={img || ""} 
                    alt={`${product.nombre} - imagen ${idx + 1}`} 
                    fill 
                    className="object-cover" 
                  />
                </button>
              ))}

              {/* ✅ Miniatura del video de YouTube */}
              {videoId && (
                <button
                  onClick={() => {
                    setShowingVideo(true);
                    setSelectedImage("");
                  }}
                  className={`aspect-square rounded-lg overflow-hidden relative bg-gray-900 border-2 transition group ${
                    showingVideo ? "border-red-600 ring-2 ring-red-300" : "border-transparent hover:border-red-400"
                  }`}
                >
                  {/* Thumbnail del video de YouTube */}
                  <Image
                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt="Video del producto"
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition"
                  />
                  {/* Ícono de Play */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-600 rounded-full p-2 shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                  {/* Etiqueta "VIDEO" */}
                  <div className="absolute bottom-1 left-1 right-1 bg-red-600 text-white text-[8px] font-bold text-center py-0.5 rounded">
                    VIDEO
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
              {product.nombre}
            </h1>
            {product.categoria && (
              <Link 
                href={`/${product.categoriaSlug}`}
                className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200 transition"
              >
                {product.categoria}
              </Link>
            )}
          </div>

          {/* Precio */}
          <div className="border-t border-b py-4">
            <p className="text-4xl font-bold text-indigo-600">
              S/ {product.precio.toFixed(2)}
            </p>
          </div>

          {/* Stock */}
          {product.stock && (
            <div className="flex items-center gap-2">
              <span className="text-lg">Stock:</span>
              <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${getStockColor(product.stock)}`}>
                {getStockIcon(product.stock)} {product.stock}
              </span>
            </div>
          )}

          {/* Delivery */}
          {product.deliveryHuancayo && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg 
                  className="w-8 h-8 text-green-600" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                </svg>
                <div>
                  <p className="font-bold text-green-700">Delivery gratis en Huancayo</p>
                </div>
              </div>
            </div>
          )}

          {/* Descripción corta */}
          {product.descripcion && (
            <div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Descripción</h3>
              <p className="text-gray-700 leading-relaxed">{product.descripcion}</p>
            </div>
          )}

          {/* Selector de cantidad */}
          {product.stock !== "Agotado" && (
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
                  className="w-20 text-center border-2 border-gray-300 rounded-lg font-bold text-xl focus:border-indigo-500 outline-none py-3"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-12 h-12 rounded-lg flex items-center justify-center transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3 pt-4">
            {product.stock !== "Agotado" && (
              <>
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-6 h-6" />
                  Agregar al Carrito ({quantity})
                </button>
                
                {product.whatsappLink ? (
                  <a 
                    href={product.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Comprar por WhatsApp
                  </a>
                ) : (
                  <button className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Comprar por WhatsApp
                  </button>
                )}
              </>
            )}
            
            {product.stock === "Agotado" && (
              <div className="w-full bg-gray-300 text-gray-600 py-4 rounded-lg font-bold text-lg text-center cursor-not-allowed">
                Producto Agotado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descripción completa */}
      {product.descripcionCompleta && (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Descripción Completa</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {product.descripcionCompleta}
          </p>
        </div>
      )}

      {/* Características */}
      {product.caracteristicas && product.caracteristicas.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Características</h2>
          <ul className="space-y-3">
            {product.caracteristicas.map((carac, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-indigo-600 text-xl mt-1">•</span>
                <span className="text-gray-700">{carac}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Información adicional */}
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 md:p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Información de Compra</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Precios Cómodos */}
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-bold text-gray-800">Precios Cómodos</h3>
            <p className="text-sm text-gray-600">Los mejores precios del mercado</p>
          </div>
        </div>

        {/* Métodos de Pago con logos */}
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-2">Métodos de Pago</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {/* YAPE */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 flex items-center justify-center w-16 h-10">
                <svg viewBox="0 0 100 40" className="w-full h-full">
                  <rect width="100" height="40" rx="6" fill="#722D85"/>
                  <text x="50" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">YAPE</text>
                </svg>
              </div>

              {/* PLIN */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 flex items-center justify-center w-16 h-10">
                <svg viewBox="0 0 100 40" className="w-full h-full">
                  <rect width="100" height="40" rx="6" fill="#00D4AA"/>
                  <text x="50" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">PLIN</text>
                </svg>
              </div>

              {/* Efectivo */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200 flex items-center justify-center w-16 h-10">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Productos Relacionados */}
    {relatedProducts.length > 0 && (
      <div className="mt-16 border-t pt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            También te puede interesar
          </h2>
          {product.categoria && (
            <Link 
              href={`/${product.categoriaSlug}`}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm md:text-base flex items-center gap-1"
            >
              Ver más de {product.categoria}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {relatedProducts.slice(0, 4).map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>

        {relatedProducts.length > 4 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
            {relatedProducts.slice(4, 8).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    )}
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