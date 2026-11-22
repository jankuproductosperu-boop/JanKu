import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/Components/ProductCard/ProductCard";
import type { Product, Banner } from "@/types";

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
      <Image
        src={banner.imagenUrl}
        alt={banner.titulo}
        fill
        className="object-contain"
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
      />
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
      <Image
        src={banner.imagenUrl}
        alt={banner.titulo}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
      />
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
