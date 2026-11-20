"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BookOpen, ClipboardList } from "lucide-react";
import type { Permiso } from "@/types";

// Campana de la barra superior (fase 23a, Q3): pedidos pendientes y reclamos por responder,
// con los endpoints que ya existen. Si no hay permiso o la petición falla, ese aviso no aparece.

type Conteos = { pedidos: number | null; reclamos: number | null };

const plural = (n: number, cero: string, uno: string, varios: string) =>
  n === 0 ? cero : n === 1 ? `1 ${uno}` : `${n} ${varios}`;

async function contar(url: string): Promise<number | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const datos: unknown = await res.json();
    return datos && typeof datos === "object" && "total" in datos && typeof datos.total === "number" ? datos.total : null;
  } catch {
    return null;
  }
}

export default function Avisos({ puede }: { puede: (p: Permiso) => boolean }) {
  const verPedidos = puede("pedidos.ver");
  const [abierto, setAbierto] = useState(false);
  const [conteos, setConteos] = useState<Conteos>({ pedidos: null, reclamos: null });
  const [recarga, setRecarga] = useState(0);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verPedidos) return;
    let activo = true;
    Promise.all([
      contar("/api/admin/orders?estado=pendiente&pageSize=1"),
      contar("/api/admin/complaints?estado=pendiente&pageSize=1"),
    ]).then(([pedidos, reclamos]) => {
      if (activo) setConteos({ pedidos, reclamos });
    });
    return () => {
      activo = false;
    };
  }, [verPedidos, recarga]);

  // Cerrar al hacer clic fuera o con Escape.
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

  if (!verPedidos) return null;

  const total = (conteos.pedidos ?? 0) + (conteos.reclamos ?? 0);
  const filas = [
    conteos.pedidos !== null && {
      href: "/admin/pedidos",
      icono: ClipboardList,
      texto: plural(conteos.pedidos, "Ningún pedido pendiente", "pedido pendiente de confirmar", "pedidos pendientes de confirmar"),
      n: conteos.pedidos,
    },
    conteos.reclamos !== null && {
      href: "/admin/reclamos",
      icono: BookOpen,
      texto: plural(conteos.reclamos, "Ningún reclamo por responder", "reclamo por responder", "reclamos por responder"),
      n: conteos.reclamos,
    },
  ].filter((f): f is { href: string; icono: typeof Bell; texto: string; n: number } => Boolean(f));

  return (
    <div ref={caja} className="relative flex-none">
      <button
        onClick={() => {
          if (!abierto) setRecarga((n) => n + 1);
          setAbierto((v) => !v);
        }}
        aria-label={total ? `Avisos: ${total} pendientes` : "Avisos"}
        aria-expanded={abierto}
        className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-[var(--bg)] transition"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bad)] text-white text-[10.5px] font-bold grid place-items-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-[300px] rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[var(--line)] font-semibold text-sm">Avisos</div>
          {filas.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[var(--muted)]">No se pudieron cargar los avisos.</p>
          ) : (
            <ul>
              {filas.map((f) => (
                <li key={f.href}>
                  <Link
                    href={f.href}
                    onClick={() => setAbierto(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--bg)] transition"
                  >
                    <span
                      className={`w-9 h-9 rounded-full grid place-items-center flex-none ${
                        f.n > 0 ? "bg-[var(--warn-soft)] text-[var(--warn)]" : "bg-[var(--ok-soft)] text-[var(--ok)]"
                      }`}
                    >
                      <f.icono className="w-4 h-4" />
                    </span>
                    <span>{f.texto}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
