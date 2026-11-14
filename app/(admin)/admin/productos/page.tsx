"use client";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import ProductosTab from "@/app/(admin)/admin/_components/ProductosTab";

export default function ProductosPage() {
  const { products,categories, loadProducts } = useAdminData();
  return (
    <Seccion titulo="Productos">
      <ProductosTab products={products} categories={categories} onReload={loadProducts} />
    </Seccion>
  );
}
