"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchWithCache } from "@/lib/cache";
import ProductCard from "../ProductCard/ProductCard";

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
  mostrarEnHome?: boolean;
  imagenesAdicionales?: string[];
  ordenHome?: number;
};

type Banner = {
  _id: string;
  titulo: string;
  imagenUrl: string;
  enlace?: string;
  posicion: "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right";
  ubicaciones?: string[];
  activo: boolean;
};

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

export default function HomeProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [productsData, bannersData] = await Promise.all([
          fetchWithCache<Product[]>("/api/products"),
          fetchWithCache<Banner[]>("/api/banners")
        ]);

        const validProducts = Array.isArray(productsData) ? productsData : [];
        const validBanners = Array.isArray(bannersData) ? bannersData : [];

        // Filtrar productos para home y ordenarlos según "ordenHome"
        // (los que no tienen valor asignado quedan al final).
        const homeProducts = validProducts
          .filter((p: Product) => p.mostrarEnHome === true)
          .sort((a, b) => (a.ordenHome ?? Infinity) - (b.ordenHome ?? Infinity));
        setProducts(homeProducts);

        const homeBanners = validBanners.filter(
          (b: Banner) => b.ubicaciones && Array.isArray(b.ubicaciones) && b.ubicaciones.includes("")
        );
        setBanners(homeBanners);
        
        setLoading(false);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setProducts([]);
        setBanners([]);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <section className="w-full max-w-[1000px] mx-auto pb-10 select-none pl-2">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-48 md:h-64 bg-gray-300 rounded-md animate-pulse" />
          <div className="h-48 md:h-64 bg-gray-300 rounded-md animate-pulse" />
        </div>
      </section>
    );
  }

  const getBannerByPosition = (position: string) => {
    return banners.find(b => b.posicion === position && b.activo);
  };

  const topLeft = getBannerByPosition("top-left");
  const topRight = getBannerByPosition("top-right");
  const middleFull = getBannerByPosition("middle-full");
  const bottomLeft = getBannerByPosition("bottom-left");
  const bottomRight = getBannerByPosition("bottom-right");

  return (
    <section className="w-full max-w-[1000px] mx-auto pb-10 select-none px-2 md:px-4">
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
        <BannerBox banner={topLeft} placeholder="Banner arriba izquierda" />
        <BannerBox banner={topRight} placeholder="Banner arriba derecha" />
      </div>

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