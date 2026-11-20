"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Maximize, Menu, Minimize, Moon, Sun } from "lucide-react";
import type { Permiso } from "@/types";
import type { Tema } from "@/app/(admin)/admin/_components/useTema";
import type { AdminSesionVisible } from "@/app/(admin)/admin/_components/useAdminSession";
import BuscadorPanel from "@/app/(admin)/admin/_components/BuscadorPanel";
import Avisos from "@/app/(admin)/admin/_components/Avisos";

const ROL: Record<string, string> = { superadmin: "Superadmin", gestor: "Gestor", ventas: "Ventas" };

// Pantalla completa: se lee del navegador, sin estado propio.
const suscribirPantalla = (avisar: () => void) => {
  document.addEventListener("fullscreenchange", avisar);
  return () => document.removeEventListener("fullscreenchange", avisar);
};
const enPantallaCompleta = () => Boolean(document.fullscreenElement);
const enServidor = () => false;

function alternarPantallaCompleta() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  } catch {
    /* el navegador no lo permite */
  }
}

function MenuUsuario({ admin }: { admin: AdminSesionVisible | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const salir = async () => {
    if (!confirm("¿Cerrar sesión?")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* se redirige igual */
    }
    router.push("/login-admin");
  };

  const nombre = admin?.nombre || admin?.username || "…";
  return (
    <div ref={caja} className="relative flex-none">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Menú de usuario"
        className="flex items-center gap-2.5 h-[70px] pl-3 pr-2 sm:pr-4 bg-[var(--bg)] hover:brightness-[0.98] transition"
      >
        <span className="w-9 h-9 rounded-full bg-[var(--accent)] text-white grid place-items-center font-bold flex-none">
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span className="hidden md:block text-left leading-tight">
          <b className="block text-sm font-semibold max-w-[140px] truncate">{nombre}</b>
          <small className="text-xs text-[var(--muted)]">{admin ? ROL[admin.rol] ?? admin.rol : ""}</small>
        </span>
        <ChevronDown className="hidden md:block w-4 h-4 text-[var(--muted)]" />
      </button>
      {abierto && (
        <div className="absolute right-2 mt-1 w-52 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-xl overflow-hidden z-50 py-1">
          <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--line)]">¡Hola, {nombre}!</p>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--bg)]"
          >
            <ExternalLink className="w-4 h-4 text-[var(--muted)]" /> Ver tienda
          </Link>
          <button onClick={salir} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--bg)] text-left">
            <LogOut className="w-4 h-4 text-[var(--muted)]" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminTopbar({
  onMenu,
  onAlternarBarra,
  tema,
  onTema,
  admin,
  puede,
}: {
  onMenu: () => void;
  onAlternarBarra: () => void;
  tema: Tema;
  onTema: () => void;
  admin: AdminSesionVisible | null;
  puede: (p: Permiso) => boolean;
}) {
  const completa = useSyncExternalStore(suscribirPantalla, enPantallaCompleta, enServidor);
  const icono = "w-10 h-10 grid place-items-center rounded-full hover:bg-[var(--bg)] transition flex-none";

  return (
    <header className="panel-topbar sticky top-0 z-20 h-[70px] flex items-center gap-2 sm:gap-3 pl-3 sm:pl-5">
      <button onClick={onMenu} aria-label="Abrir menú" className={`${icono} min-[861px]:hidden`}>
        <Menu className="w-5 h-5" />
      </button>
      <button onClick={onAlternarBarra} aria-label="Contraer o expandir la barra lateral" className={`${icono} hidden min-[861px]:grid`}>
        <Menu className="w-5 h-5" />
      </button>
      <BuscadorPanel puede={puede} />
      <span className="flex-1" />
      <button onClick={alternarPantallaCompleta} aria-label={completa ? "Salir de pantalla completa" : "Pantalla completa"} className={`${icono} hidden sm:grid`}>
        {completa ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>
      <button onClick={onTema} aria-label={tema === "oscuro" ? "Tema claro" : "Tema oscuro"} title={tema === "oscuro" ? "Tema claro" : "Tema oscuro"} className={icono}>
        {tema === "oscuro" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <Avisos puede={puede} />
      <MenuUsuario admin={admin} />
    </header>
  );
}
