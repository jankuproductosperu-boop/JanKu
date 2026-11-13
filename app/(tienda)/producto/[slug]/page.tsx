import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerProductoPorSlug } from "@/server/services/product.service";
import ProductPageClient from "./ProductPageClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await obtenerProductoPorSlug(slug);

  if (!product) {
    return { title: "Producto no encontrado | Janku" };
  }

  const titulo = product.metaTitulo || product.nombre;
  const descripcion =
    product.metaDescripcion ||
    product.descripcion ||
    `Cómpralo en Janku por S/ ${product.precio.toFixed(2)}`;
  const imagen = product.metaImagen || product.imagenUrl;

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      images: imagen
        ? [{ url: imagen, width: 800, height: 800, alt: product.nombre }]
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

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await obtenerProductoPorSlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={product} />;
}