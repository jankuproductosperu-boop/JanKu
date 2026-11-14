"use client";
import Link from "next/link";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import ProductoForm from "@/app/(admin)/admin/_components/ProductoForm";

export default function NuevoProductoPage() {
  const { categories, loadProducts } = useAdminData();
  return (
    <Seccion titulo="Nuevo producto">
      <Link href="/admin/productos" className="-mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">← Volver a productos</Link>
      <ProductoForm categories={categories} onSaved={loadProducts} />
    </Seccion>
  );
}
