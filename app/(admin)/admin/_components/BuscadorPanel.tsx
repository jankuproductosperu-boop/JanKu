"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Permiso } from "@/types";

// Buscador rápido de la barra superior (fase 23a, Q2). Solo navega con los endpoints que ya existen:
// JK-… → pedido (si hay uno solo con ese código), LR-… → reclamos, texto → productos.
export default function BuscadorPanel({ puede }: { puede: (p: Permiso) => boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [buscando, setBuscando] = useState(false);

  const buscar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = q.trim();
    if (!texto) return;

    if (/^JK-/i.test(texto) && puede("pedidos.ver")) {
      setBuscando(true);
      try {
        const params = new URLSearchParams({ q: texto.toUpperCase(), pageSize: "2" });
        const res = await fetch(`/api/admin/orders?${params}`);
        const datos: unknown = res.ok ? await res.json() : null;
        const items =
          datos && typeof datos === "object" && "items" in datos && Array.isArray(datos.items)
            ? (datos.items as { _id: string }[])
            : [];
        router.push(items.length === 1 ? `/admin/pedidos/${items[0]._id}` : "/admin/pedidos");
      } catch {
        router.push("/admin/pedidos");
      } finally {
        setBuscando(false);
        setQ("");
      }
      return;
    }
    if (/^LR-/i.test(texto) && puede("pedidos.ver")) {
      setQ("");
      router.push("/admin/reclamos");
      return;
    }
    router.push(`/admin/productos?q=${encodeURIComponent(texto)}`);
  };

  return (
    <form
      onSubmit={buscar}
      role="search"
      className="hidden sm:flex flex-1 max-w-[340px] items-center gap-2 rounded-[10px] bg-[var(--bg)] px-3.5 py-2.5"
    >
      <Search className="w-4 h-4 text-[var(--muted)] flex-none" aria-hidden="true" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar producto, JK-… o LR-…"
        aria-label="Buscar en el panel"
        disabled={buscando}
        className="bg-transparent w-full outline-none text-sm"
      />
    </form>
  );
}
