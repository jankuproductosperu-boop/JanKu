"use client";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import PromocionesTab from "@/app/(admin)/admin/_components/PromocionesTab";

export default function PromocionesPage() {
  const { promotions, loadPromotions } = useAdminData();
  return (
    <Seccion titulo="Promociones">
      <PromocionesTab promotions={promotions} onReload={loadPromotions} />
    </Seccion>
  );
}
