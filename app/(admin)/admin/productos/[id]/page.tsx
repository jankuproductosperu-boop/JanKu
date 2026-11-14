"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import ProductoForm from "@/app/(admin)/admin/_components/ProductoForm";

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const { cargado, products, categories, loadProducts } = useAdminData();
  const product = products.find((p) => p._id === id);

  return (
    <Seccion titulo="Editar producto">
      <Link href="/admin/productos" className="-mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">← Volver a productos</Link>
      {!cargado ? (
        <p className="text-[var(--muted)]">Cargando producto…</p>
      ) : !product ? (
        <p className="text-[var(--muted)]">No se encontró el producto.</p>
      ) : (
        <ProductoForm key={product._id} product={product} categories={categories} onSaved={loadProducts} />
      )}
    </Seccion>
  );
}
