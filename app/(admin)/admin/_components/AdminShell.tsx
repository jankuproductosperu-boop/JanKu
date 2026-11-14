"use client";
import { useState } from "react";
import AdminSidebar from "@/app/(admin)/admin/_components/AdminSidebar";
import AdminTopbar from "@/app/(admin)/admin/_components/AdminTopbar";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { admin, cargando } = useAdminSession();

  return (
    <div className="panel min-h-screen min-[861px]:grid min-[861px]:grid-cols-[1fr_252px]">
      <div className="min-w-0">
        <AdminTopbar onMenu={() => setMenuAbierto(true)} />
        <main>
          {cargando ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mb-4"></div>
                <p className="text-[var(--muted)] font-medium">Verificando acceso...</p>
              </div>
            </div>
          ) : admin ? children : null}
        </main>
      </div>
      <AdminSidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
    </div>
  );
}
