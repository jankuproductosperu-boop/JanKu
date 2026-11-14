"use client";
import { useEffect, useState } from "react";
import { useAdminData } from "@/app/(admin)/admin/_components/useAdminData";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import PopupForm from "@/app/(admin)/admin/_components/PopupForm";
import type { Popup } from "@/types";

export default function PopupPage() {
  const { products, categories, promotions } = useAdminData();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch("/api/admin/popup");
        setPopup(res.ok ? await res.json() : null);
      } catch {
        setPopup(null);
      }
      setCargado(true);
    };
    cargar();
  }, []);

  return (
    <Seccion titulo="Popup de oferta">
      <p className="-mt-4 text-[var(--muted)]">Una ventana con una imagen y un botón que aparece cuando alguien entra a la tienda.</p>
      {cargado ? (
        <PopupForm popup={popup} products={products} categories={categories} promotions={promotions} onSaved={setPopup} />
      ) : (
        <p className="text-[var(--muted)]">Cargando…</p>
      )}
    </Seccion>
  );
}
