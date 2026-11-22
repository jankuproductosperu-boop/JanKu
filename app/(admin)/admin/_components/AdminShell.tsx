"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/app/(admin)/admin/_components/AdminSidebar";
import AdminTopbar from "@/app/(admin)/admin/_components/AdminTopbar";
import Personalizador, { BotonPersonalizador } from "@/app/(admin)/admin/_components/Personalizador";
import { useTema } from "@/app/(admin)/admin/_components/useTema";
import { usePreferenciasPanel } from "@/app/(admin)/admin/_components/usePreferenciasPanel";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

const RUTA_SEGURIDAD = "/admin/seguridad";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [personalizando, setPersonalizando] = useState(false);
  const { admin, cargando, puede: puedeSesion, activar2fa } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();
  // Fase 26b: el superadmin sin 2FA solo puede estar en Seguridad (el servidor responde 403 en lo demás).
  const enSeguridad = pathname === RUTA_SEGURIDAD;
  const bloqueadoPor2fa = activar2fa && !enSeguridad;
  const puede = activar2fa ? () => false : puedeSesion;

  useEffect(() => {
    if (bloqueadoPor2fa) router.replace(RUTA_SEGURIDAD);
  }, [bloqueadoPor2fa, router]);
  const { tema, alternar } = useTema();
  const prefs = usePreferenciasPanel();

  // El botón de la barra superior (escritorio) alterna entre la barra elegida y "solo iconos".
  const alternarBarra = () => prefs.setTamanoBarra(prefs.tamanoBarra === "iconos" ? "normal" : "iconos");

  return (
    <div
      data-theme={tema === "oscuro" ? "dark" : "light"}
      data-sidebar-size={prefs.tamanoBarra}
      data-sidebar-color={prefs.colorBarra}
      data-layout-width={prefs.ancho}
      className="panel min-h-screen"
    >
      <div className="panel-shell min-h-screen bg-[var(--bg)]">
        <AdminSidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} puede={puede} />
        <div className="min-w-0">
          <AdminTopbar
            onMenu={() => setMenuAbierto(true)}
            onAlternarBarra={alternarBarra}
            tema={tema}
            onTema={alternar}
            admin={admin}
            puede={puede}
          />
          <main>
            {cargando ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mb-4"></div>
                  <p className="text-[var(--muted)] font-medium">Verificando acceso...</p>
                </div>
              </div>
            ) : admin && !bloqueadoPor2fa ? children : null}
          </main>
        </div>
      </div>
      {admin && <BotonPersonalizador onAbrir={() => setPersonalizando(true)} />}
      <Personalizador abierto={personalizando} onCerrar={() => setPersonalizando(false)} />
    </div>
  );
}
