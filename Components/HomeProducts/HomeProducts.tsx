import Link from "next/link";
import { preload } from "react-dom";
import ProductCard from "@/Components/ProductCard/ProductCard";
import { imagenCloudinary, srcSetCloudinary } from "@/lib/imagenCloudinary";
import type { Product, Banner } from "@/types";

// Fase 27b (D-92): cada banner se pide a Cloudinary al ancho en que se ve. Es una <img> con srcSet
// porque next/image, con unoptimized en next.config, no arma srcSet. Mismo marcado que daba
// next/image con `fill` y `priority`: posición absoluta y precarga.
const ESTILO_FILL = {
  position: "absolute",
  height: "100%",
  width: "100%",
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  color: "transparent",
} as const;

function ImagenBanner({ banner, anchos, sizes }: { banner: Banner; anchos: readonly number[]; sizes: string }) {
  const src = imagenCloudinary(banner.imagenUrl, anchos[anchos.length - 1]);
  const srcSet = srcSetCloudinary(banner.imagenUrl, anchos);
  preload(src, { as: "image", imageSrcSet: srcSet, imageSizes: sizes });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- D-92
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={banner.titulo}
      decoding="async"
      className="object-contain"
      style={ESTILO_FILL}
    />
  );
}

// Dos por fila en toda pantalla, dentro de un contenedor de 1000 px como máximo.
const ANCHOS_BANNER_MITAD = [320, 480, 640, 800] as const;
const SIZES_BANNER_MITAD = "(max-width: 1000px) 50vw, 500px";
const ANCHOS_BANNER_ANCHO = [480, 640, 828, 1080, 1280, 1600, 2000] as const;
const SIZES_BANNER_ANCHO = "(max-width: 1000px) 100vw, 1000px";

function BannerBox({ banner, placeholder }: { banner?: Banner; placeholder?: string }) {
  if (!banner) {
    return (
      <div className="w-full aspect-[16/9] bg-gray-300 rounded-md flex items-center justify-center">
        <span className="text-gray-500 text-xs">
          {placeholder || "Sin banner"}
        </span>
      </div>
    );
  }

  const content = (
    <div className="w-full aspect-[16/9] rounded-md overflow-hidden relative transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
      <ImagenBanner banner={banner} anchos={ANCHOS_BANNER_MITAD} sizes={SIZES_BANNER_MITAD} />
    </div>
  );

  if (banner.enlace) {
    return <Link href={banner.enlace}>{content}</Link>;
  }

  return content;
}

function BannerFullWidth({ banner }: { banner?: Banner }) {
  if (!banner) {
    return (
      <div className="w-full aspect-[16/5] bg-gray-200 rounded-md flex items-center justify-center">
        <span className="text-gray-500 text-xs">Sin banner promocional</span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[16/5] rounded-md overflow-hidden relative">
      <ImagenBanner banner={banner} anchos={ANCHOS_BANNER_ANCHO} sizes={SIZES_BANNER_ANCHO} />
    </div>
  );
}

export type PosicionBannerInicio = "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right";

// Fase 27 (D-91): los datos llegan ya resueltos desde la página del inicio (servidor) y aquí solo se
// dibujan, con el mismo marcado que antes (N1-1). La espera la cubre app/(tienda)/loading.tsx.
export default function HomeProducts({
  novedades,
  products,
  banners,
}: {
  /** Novedades vigentes, las más recientes primero (máx. 8). */
  novedades: Product[];
  /** Marcados para el inicio, por ordenHome, sin las novedades. */
  products: Product[];
  /** Banner del inicio por posición; si falta, se ve el recuadro gris de siempre. */
  banners: Partial<Record<PosicionBannerInicio, Banner>>;
}) {
  const topLeft = banners["top-left"];
  const topRight = banners["top-right"];
  const middleFull = banners["middle-full"];
  const bottomLeft = banners["bottom-left"];
  const bottomRight = banners["bottom-right"];

  return (
    <section className="w-full max-w-[1000px] mx-auto pb-10 select-none px-2 md:px-4">
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
        <BannerBox banner={topLeft} placeholder="Banner arriba izquierda" />
        <BannerBox banner={topRight} placeholder="Banner arriba derecha" />
      </div>

      {novedades.length > 0 && (
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-[#2C2C6C] mb-2 md:mb-3">Novedades de la semana</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {novedades.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        {products.slice(0, 12).map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      <BannerFullWidth banner={middleFull} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        {products.slice(12, 24).map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
        <BannerBox banner={bottomLeft} placeholder="Banner abajo izquierda" />
        <BannerBox banner={bottomRight} placeholder="Banner abajo derecha" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        {products.slice(24).map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}
