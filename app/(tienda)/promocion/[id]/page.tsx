import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { indiceDePromocion, obtenerPromocion } from "@/server/services/promotion.service";
import PromocionPageClient from "./PromocionPageClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promotion = await obtenerPromocion(id);

  if (!promotion) {
    return { title: "Promoción no encontrada | Janku" };
  }

  const titulo = promotion.metaTitulo || promotion.titulo;
  const descripcion =
    promotion.metaDescripcion ||
    promotion.descripcion ||
    `Oferta especial en Janku por S/ ${promotion.precio.toFixed(2)}`;
  const imagen = promotion.metaImagen || promotion.imagenUrl;

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      images: imagen
        ? [{ url: imagen, width: 800, height: 800, alt: promotion.titulo }]
        : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      images: imagen ? [imagen] : undefined,
    },
  };
}

export default async function PromocionPage({ params }: Props) {
  const { id } = await params;
  const [promotion, promotionIndex] = await Promise.all([
    obtenerPromocion(id),
    indiceDePromocion(id),
  ]);

  if (!promotion) {
    notFound();
  }

  return <PromocionPageClient promotion={promotion} promotionIndex={promotionIndex} />;
}