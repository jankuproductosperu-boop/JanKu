"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Permiso } from "@/types";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

const ENLACES: { href: string; etiqueta: string; permiso?: Permiso }[] = [
  { href: "/admin", etiqueta: "Catálogo", permiso: "catalogo.editar" },
  { href: "/admin/inventario", etiqueta: "Inventario", permiso: "inventario.ver" },
  { href: "/admin/orden", etiqueta: "Orden", permiso: "catalogo.editar" },
  { href: "/admin/descuentos", etiqueta: "Descuentos", permiso: "descuentos.gestionar" },
  // fase 17: Pedidos · fase 19: Cupones · fase 21: Usuarios
];

export default function AdminNav() {
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
  const visibles = ENLACES.filter((e) => !e.permiso || puede(e.permiso));

  return (
    <nav className="sticky top-0 z-30 h-14 bg-[#2C2C6C] text-white flex items-center justify-between gap-4 px-4 overflow-x-auto">
      <div className="flex items-center gap-1 flex-shrink-0">
        {visibles.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activo(e.href) ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            {e.etiqueta}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-sm">
        {admin && <span className="whitespace-nowrap">{admin.nombre}</span>}
        <Link href="/" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap hover:underline">Ver tienda</Link>
        <button onClick={handleLogout} className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition font-medium whitespace-nowrap">Cerrar sesión</button>
      </div>
    </nav>
  );
}
