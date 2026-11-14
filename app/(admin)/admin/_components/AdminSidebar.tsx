"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree, Archive, ListOrdered,
  Tag, Sparkles, Image as ImageIcon, LogOut,
} from "lucide-react";
import type { Permiso } from "@/types";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

type Item = { grupo?: string; href: string; etiqueta: string; permiso?: Permiso; icono: React.ComponentType<{ className?: string }> };

const MENU: Item[] = [
  { href: "/admin", etiqueta: "Resumen", icono: LayoutDashboard },
  { grupo: "Catálogo", href: "/admin/productos", etiqueta: "Productos", permiso: "catalogo.editar", icono: Package },
  { href: "/admin/categorias", etiqueta: "Categorías", permiso: "catalogo.editar", icono: FolderTree },
  { href: "/admin/inventario", etiqueta: "Inventario", permiso: "inventario.ver", icono: Archive },
  { href: "/admin/orden", etiqueta: "Orden", permiso: "catalogo.editar", icono: ListOrdered },
  { grupo: "Marketing", href: "/admin/descuentos", etiqueta: "Descuentos", permiso: "descuentos.gestionar", icono: Tag },
  { href: "/admin/promociones", etiqueta: "Promociones", permiso: "catalogo.editar", icono: Sparkles },
  { href: "/admin/banners", etiqueta: "Banners", permiso: "catalogo.editar", icono: ImageIcon },
  // fase 13b/16b: Novedades · 16c: Popup · 17: Pedidos · 19: Cupones · 21: Usuarios · 21b: Estadísticas
];

export default function AdminSidebar({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, puede } = useAdminSession();

  const handleLogout = async () => {
    if (confirm("¿Cerrar sesión?")) {
      try { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login-admin"); }
      catch { console.error("Error al cerrar sesión"); }
    }
  };

  const activo = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  // Cada elemento hereda el grupo del anterior; la etiqueta solo se pinta si hay elementos visibles.
  const conGrupo = MENU.map((i, idx) => {
    const previos = MENU.slice(0, idx + 1).filter((x) => x.grupo);
    return { ...i, grupoEfectivo: previos.length ? previos[previos.length - 1].grupo! : "" };
  });
  const visibles = conGrupo.filter((i) => !i.permiso || puede(i.permiso));

  return (
    <>
      {abierto && <div className="fixed inset-0 z-30 bg-black/40 min-[861px]:hidden" onClick={onCerrar} aria-hidden="true" />}
      <aside
        aria-label="Navegación del panel"
        className={`fixed inset-y-0 left-0 z-40 w-[270px] overflow-y-auto bg-gradient-to-b from-[var(--navy)] to-[#1c1c4d] text-[var(--navy-ink)] p-3 pt-[18px] flex flex-col gap-0.5 transition-transform motion-reduce:transition-none ${abierto ? "translate-x-0" : "-translate-x-full"} min-[861px]:static min-[861px]:z-auto min-[861px]:w-auto min-[861px]:translate-x-0 min-[861px]:sticky min-[861px]:top-0 min-[861px]:h-screen min-[861px]:self-start`}
      >
        <div className="flex items-center gap-2.5 px-2.5 pb-3.5 text-lg font-bold text-white">
          <span className="w-8 h-8 rounded-[9px] bg-white text-[var(--navy)] grid place-items-center">J</span> Janku
        </div>
        <nav className="flex flex-col gap-0.5">
          {visibles.map((i, idx) => {
            const Icono = i.icono;
            const nuevoGrupo = i.grupoEfectivo && i.grupoEfectivo !== visibles[idx - 1]?.grupoEfectivo;
            const esActivo = activo(i.href);
            return (
              <div key={i.href}>
                {nuevoGrupo && (
                  <div className="mt-3.5 mb-1 px-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-[var(--navy-mute)]">{i.grupoEfectivo}</div>
                )}
                <Link
                  href={i.href}
                  onClick={onCerrar}
                  aria-current={esActivo ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm transition ${esActivo ? "bg-white text-[var(--navy)] font-semibold shadow-md" : "hover:bg-white/10"}`}
                >
                  <Icono className={`w-[18px] h-[18px] flex-none ${esActivo ? "text-[var(--accent)]" : ""}`} />
                  {i.etiqueta}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto pt-3 border-t border-white/15">
          <div className="flex items-center gap-2.5 px-2.5 pb-2">
            <span className="w-[34px] h-[34px] rounded-full bg-[var(--accent)] text-white grid place-items-center font-bold flex-none">
              {(admin?.nombre || "A").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <b className="block truncate text-[13px] text-white">{admin?.nombre ?? "…"}</b>
              <small className="text-[var(--navy-mute)]">{admin ? `Rol: ${admin.rol}` : ""}</small>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 rounded-[9px] border border-white/25 px-2.5 py-2 text-sm hover:bg-white/10 transition">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
