  "use client";

  import Image from "next/image";
  import Link from "next/link";
  import { useState } from "react";
  import { ShoppingCart, Heart } from "lucide-react";
  import { useCart } from "@/context/CartContext";
  import { useFavorites } from "@/context/FavoritesContext";

  // Función inline para no depender de la lib en el cliente directamente
  function getCloudinaryUrl(
  publicIdOrUrl: string,
  options: { width?: number; height?: number } = {}
): string {
  // Evitar error si viene vacío o undefined
  if (!publicIdOrUrl || publicIdOrUrl.trim() === "") return "";
  
  // Si ya es una URL completa (legacy), devolverla tal cual
  if (publicIdOrUrl.startsWith("http")) {
    return publicIdOrUrl;
  }

    // Si es un public_id de Cloudinary, generar URL con transformaciones
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const { width, height } = options;

    const transformations = ["f_auto", "q_auto"];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (width || height) transformations.push("c_fill");

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(",")}/${publicIdOrUrl}`;
  }

  type Product = {
    _id: string;
    nombre: string;
    precio: number;
    descripcion?: string;
    categoria?: string;
    categoriaSlug?: string;
    stock?: "Disponible" | "Limitado" | "Agotado";

    // Nuevo sistema Cloudinary
    imagenes?: string[];          // public_ids
    imagenPrincipal?: string;     // public_id principal

    // Legacy (compatibilidad)
    imagenUrl?: string;
    imagenesAdicionales?: string[];

    slug?: string;
    deliveryHuancayo?: boolean;
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
    className = "",
  }: ProductCardProps) {
    // Resolver imagen principal
    const mainImage = (() => {
      if (product.imagenPrincipal) return product.imagenPrincipal;
      if (product.imagenes && product.imagenes.length > 0) return product.imagenes[0];
      return product.imagenUrl || "";
    })();

    // Resolver imagen hover (segunda imagen)
    const hoverImage = (() => {
      if (product.imagenes && product.imagenes.length > 1) return product.imagenes[1];
      if (product.imagenesAdicionales && product.imagenesAdicionales.length > 0)
        return product.imagenesAdicionales[0];
      return null;
    })();

    const [currentImage, setCurrentImage] = useState(mainImage);
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

      // Para el carrito usamos la URL generada con Cloudinary
      const imageForCart = getCloudinaryUrl(mainImage, { width: 300 });

      addToCart({
        _id: product._id,
        nombre: product.nombre,
        precio: product.precio,
        imagenUrl: imageForCart,
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
          imagenUrl: getCloudinaryUrl(mainImage, { width: 300 }),
          slug: product.slug,
        });
        setShowFavoriteMessage(true);
        setTimeout(() => setShowFavoriteMessage(false), 2000);
      }
    };

    const getStockColor = (stock?: string) => {
      switch (stock) {
        case "Disponible": return "bg-green-500";
        case "Limitado": return "bg-yellow-500";
        case "Agotado": return "bg-red-500";
        default: return "bg-gray-500";
      }
    };

    const resolvedCurrentUrl = getCloudinaryUrl(currentImage, {
      width: compact ? 200 : 400,
    });

    return (
      <Link
        href={`/producto/${product.slug || product._id}`}
        className={`block transition-all duration-300 hover:scale-[1.02] hover:shadow-lg rounded-md group ${className}`}
        onMouseEnter={() => {
          if (hoverImage) setCurrentImage(hoverImage);
        }}
        onMouseLeave={() => setCurrentImage(mainImage)}
      >
        <div
          className={`w-full rounded-md overflow-hidden relative bg-gray-200 ${
            compact ? "aspect-[4/3]" : "aspect-square"
          }`}
        >
          {resolvedCurrentUrl && (
            <Image
              src={resolvedCurrentUrl}
              alt={product.nombre}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
          )}

          {/* Badge Stock */}
          {product.stock && (
            <div
              className={`absolute ${
                compact ? "top-1 right-1 text-[10px] px-1.5 py-0.5" : "top-2 right-2 text-xs px-2 py-1"
              } ${getStockColor(product.stock)} text-white rounded-full font-semibold z-10`}
            >
              {product.stock}
            </div>
          )}

          {/* Botón favoritos */}
          <button
            onClick={handleToggleFavorite}
            className={`absolute ${
              compact ? "top-1 left-1 p-1.5" : "top-2 left-2 p-2"
            } bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all duration-300 z-10 hover:scale-110 ${
              isProductFavorite ? "text-red-500" : "text-gray-400 hover:text-red-500"
            }`}
            title={isProductFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <Heart
              className={compact ? "w-3 h-3" : "w-4 h-4"}
              fill={isProductFavorite ? "currentColor" : "none"}
            />
          </button>

          {/* Botón carrito */}
          {showAddToCart && product.stock !== "Agotado" && (
            <button
              onClick={handleAddToCart}
              className={`absolute ${
                compact ? "bottom-1 right-1 p-1.5" : "bottom-2 right-2 p-2"
              } bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:scale-110 z-10`}
              title="Agregar al carrito"
            >
              <ShoppingCart className={compact ? "w-3 h-3" : "w-4 h-4"} />
            </button>
          )}

          {/* Mensajes overlay */}
          {showAddedMessage && (
            <div className="absolute inset-0 bg-green-600/90 flex items-center justify-center z-20">
              <div className="text-white text-center">
                <div className={compact ? "text-2xl mb-1" : "text-3xl mb-1"}>✓</div>
                <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`}>
                  ¡Agregado al carrito!
                </p>
              </div>
            </div>
          )}

          {showFavoriteMessage && (
            <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center z-20">
              <div className="text-white text-center">
                <div className={compact ? "text-2xl mb-1" : "text-3xl mb-1"}>❤️</div>
                <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`}>
                  ¡Favorito guardado!
                </p>
              </div>
            </div>
          )}

          {showStockAlert && (
            <div className="absolute inset-0 bg-red-600/95 flex items-center justify-center z-20">
              <div className="text-white text-center px-4">
                <div className={compact ? "text-2xl mb-1" : "text-3xl mb-1"}>⚠️</div>
                <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`}>
                  Producto Agotado
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className={compact ? "mt-1" : "mt-2"}>
          <h3
            className={`text-gray-700 line-clamp-2 font-medium ${
              compact ? "text-[10px] leading-tight" : "text-xs md:text-sm"
            }`}
          >
            {product.nombre}
          </h3>

          <p
            className={`font-bold text-gray-900 ${
              compact ? "text-sm mt-0.5" : "text-base md:text-lg mt-1"
            }`}
          >
            S/ {product.precio.toFixed(2)}
          </p>

          {product.deliveryHuancayo && !compact && (
            <div className="flex items-center gap-1 mt-1">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
              <span className="text-[10px] md:text-xs text-green-600 font-medium">
                Delivery gratis
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }