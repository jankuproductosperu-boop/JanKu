"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import ProductosLista from "@/app/(admin)/admin/_components/ProductosLista";

function Contenido() {
  const q = useSearchParams().get("q") ?? "";
  const { products, categories, loadProducts } = useAdminData();
  // key={q}: si la búsqueda de la barra superior cambia, la lista se reinicia con el nuevo texto.
  return <ProductosLista key={q} busquedaInicial={q} products={products} categories={categories} onReload={loadProducts} />;
}

export default function ProductosPage() {
  return (
    <Seccion titulo="Productos">
      <Suspense fallback={null}>
        <Contenido />
      </Suspense>
    </Seccion>
  );
}
