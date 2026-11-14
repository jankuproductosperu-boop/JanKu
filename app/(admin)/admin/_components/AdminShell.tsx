"use client";
import { useState } from "react";
import AdminSidebar from "@/app/(admin)/admin/_components/AdminSidebar";
import AdminTopbar from "@/app/(admin)/admin/_components/AdminTopbar";
import { useTema } from "@/app/(admin)/admin/_components/useTema";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { admin, cargando } = useAdminSession();
  const { tema, alternar } = useTema();

  return (
    <div data-theme={tema === "oscuro" ? "dark" : "light"} suppressHydrationWarning className="panel min-h-screen min-[861px]:grid min-[861px]:grid-cols-[252px_1fr]">
      <AdminSidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="min-w-0">
        <AdminTopbar onMenu={() => setMenuAbierto(true)} tema={tema} onTema={alternar} />
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
    </div>
  );
}
