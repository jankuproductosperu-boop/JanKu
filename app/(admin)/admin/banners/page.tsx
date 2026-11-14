"use client";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import BannersTab from "@/app/(admin)/admin/_components/BannersTab";

export default function BannersPage() {
  const { banners,categories, loadBanners } = useAdminData();
  return (
    <Seccion titulo="Banners">
      <BannersTab banners={banners} categories={categories} onReload={loadBanners} />
    </Seccion>
  );
}
