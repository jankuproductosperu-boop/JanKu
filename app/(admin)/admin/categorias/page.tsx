"use client";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import CategoriasTab from "@/app/(admin)/admin/_components/CategoriasTab";

export default function CategoriasPage() {
  const { categories, loadCategories } = useAdminData();
  return (
    <Seccion titulo="Categorías">
      <CategoriasTab categories={categories} onReload={loadCategories} />
    </Seccion>
  );
}
