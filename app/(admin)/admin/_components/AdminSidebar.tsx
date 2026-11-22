"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Package, FolderTree, Archive, ListOrdered,
  Tag, Ticket, Sparkles, Image as ImageIcon, MessageSquare, MapPin, Users, BookOpen, ExternalLink, BarChart3,
  ShieldCheck,
} from "lucide-react";
import type { Permiso } from "@/types";

type Item = { grupo?: string; href: string; etiqueta: string; permiso?: Permiso; icono: React.ComponentType<{ className?: string }> };

const MENU: Item[] = [
  { grupo: "Menú", href: "/admin", etiqueta: "Resumen", icono: LayoutDashboard },
  { href: "/admin/estadisticas", etiqueta: "Estadísticas", permiso: "estadisticas.ver", icono: BarChart3 },
  { grupo: "Ventas", href: "/admin/pedidos", etiqueta: "Pedidos", permiso: "pedidos.ver", icono: ClipboardList },
  { href: "/admin/reclamos", etiqueta: "Reclamos", permiso: "pedidos.ver", icono: BookOpen },
  { href: "/admin/puntos-entrega", etiqueta: "Puntos de entrega", permiso: "catalogo.editar", icono: MapPin },
  { grupo: "Catálogo", href: "/admin/productos", etiqueta: "Productos", permiso: "catalogo.editar", icono: Package },
  { href: "/admin/categorias", etiqueta: "Categorías", permiso: "catalogo.editar", icono: FolderTree },
  { href: "/admin/inventario", etiqueta: "Inventario", permiso: "inventario.ver", icono: Archive },
  { href: "/admin/orden", etiqueta: "Orden", permiso: "catalogo.editar", icono: ListOrdered },
  { grupo: "Marketing", href: "/admin/descuentos", etiqueta: "Descuentos", permiso: "descuentos.gestionar", icono: Tag },
  { href: "/admin/cupones", etiqueta: "Cupones", permiso: "cupones.gestionar", icono: Ticket },
  { href: "/admin/promociones", etiqueta: "Promociones", permiso: "catalogo.editar", icono: Sparkles },
  { href: "/admin/banners", etiqueta: "Banners", permiso: "catalogo.editar", icono: ImageIcon },
  { href: "/admin/popup", etiqueta: "Popup de oferta", permiso: "catalogo.editar", icono: MessageSquare },
  { grupo: "Equipo", href: "/admin/usuarios", etiqueta: "Usuarios", permiso: "admins.gestionar", icono: Users },
  // Fase 26b: la verificación en dos pasos de la cuenta propia; la ve cualquier rol.
  { href: "/admin/seguridad", etiqueta: "Seguridad", icono: ShieldCheck },
];

export default function AdminSidebar({
  abierto,
  onCerrar,
  puede,
}: {
  abierto: boolean;
  onCerrar: () => void;
  puede: (p: Permiso) => boolean;
}) {
  const pathname = usePathname();
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
        className={`panel-sidebar fixed inset-y-0 left-0 z-40 w-[270px] overflow-y-auto flex flex-col transition-transform motion-reduce:transition-none ${abierto ? "translate-x-0" : "-translate-x-full"} min-[861px]:z-auto min-[861px]:w-auto min-[861px]:translate-x-0 min-[861px]:sticky min-[861px]:top-0 min-[861px]:h-screen min-[861px]:self-start`}
      >
        <Link href="/admin" onClick={onCerrar} className="sb-marca h-[70px] flex-none flex items-center gap-2.5 px-5 text-lg font-bold tracking-wide">
          <span className="sb-logo w-9 h-9 rounded-[10px] grid place-items-center flex-none overflow-hidden">
            <Image src="/apple-touch-icon.png" alt="" width={30} height={30} priority />
          </span>
          <span className="sb-marca-texto">JANKU</span>
        </Link>

        <nav className="flex flex-col gap-0.5 px-3 pb-4">
          {visibles.map((i, idx) => {
            const Icono = i.icono;
            const nuevoGrupo = i.grupoEfectivo && i.grupoEfectivo !== visibles[idx - 1]?.grupoEfectivo;
            const esActivo = activo(i.href);
            return (
              <div key={i.href}>
                {nuevoGrupo && (
                  <>
                    <div className="sb-grupo mt-4 mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider">{i.grupoEfectivo}</div>
                    <div className="sb-separador hidden mx-3 my-2 border-t border-current opacity-20" aria-hidden="true" />
                  </>
                )}
                <Link
                  href={i.href}
                  onClick={onCerrar}
                  aria-current={esActivo ? "page" : undefined}
                  aria-label={i.etiqueta}
                  className="sb-link relative flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[14.5px] transition"
                >
                  <Icono className="w-[18px] h-[18px] flex-none" />
                  <span className="sb-texto truncate">{i.etiqueta}</span>
                  <span
                    role="tooltip"
                    className="sb-tip absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md bg-[var(--ink)] px-2.5 py-1 text-xs font-medium text-[var(--surface)] shadow-lg"
                  >
                    {i.etiqueta}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver tienda"
            className="sb-link relative flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[14.5px] transition"
          >
            <ExternalLink className="w-[18px] h-[18px] flex-none" />
            <span className="sb-texto">Ver tienda</span>
            <span role="tooltip" className="sb-tip absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md bg-[var(--ink)] px-2.5 py-1 text-xs font-medium text-[var(--surface)] shadow-lg">
              Ver tienda
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
