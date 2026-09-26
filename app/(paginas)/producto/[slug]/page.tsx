import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductPageClient from "./ProductPageClient";
import { extractCodigoUrl } from "@/lib/productUrl";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProduct(slug: string) {
  await connectDB();

  // 1. Intentar por el código corto — es como funcionan los links nuevos
  const codigoUrl = extractCodigoUrl(slug);
  const porCodigo = await Product.findOne({ codigoUrl }).lean();
  if (porCodigo) return porCodigo;

  // 2. Fallback — links viejos ya compartidos antes de este cambio,
  // o alguien que entró directo con el _id
  const esObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
  const product = await Product.findOne(
    esObjectId ? { $or: [{ slug }, { _id: slug }] } : { slug }
  ).lean();

  return product;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

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
  const productDoc = await getProduct(slug);

  if (!productDoc) {
    notFound();
  }

  // Serializar para pasar de servidor a cliente (quita tipos de Mongo como ObjectId/Date)
  const product = JSON.parse(JSON.stringify(productDoc));

  return <ProductPageClient product={product} />;
}