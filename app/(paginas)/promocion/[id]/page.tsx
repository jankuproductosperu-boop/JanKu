import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Promotion from "@/models/Promotion";
import PromocionPageClient from "./PromocionPageClient";

type Props = {
  params: Promise<{ id: string }>;
};

async function getPromotion(id: string) {
  await connectDB();

  const esObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!esObjectId) return null;

  const promotion = await Promotion.findById(id).lean();
  return promotion;
}

// El índice se usa para el nombre "Promoción N" — se calcula contra
// el mismo orden que ya usa la página de listado /promociones
async function getPromotionIndex(id: string) {
  await connectDB();
  const activas = await Promotion.find({ activo: true }).sort({ orden: 1 }).select("_id").lean();
  const index = activas.findIndex((p) => p._id.toString() === id);
  return index !== -1 ? index : 0;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getPromotion(id);

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
  const [promotionDoc, promotionIndex] = await Promise.all([
    getPromotion(id),
    getPromotionIndex(id),
  ]);

  if (!promotionDoc) {
    notFound();
  }

  const promotion = JSON.parse(JSON.stringify(promotionDoc));

  return <PromocionPageClient promotion={promotion} promotionIndex={promotionIndex} />;
}