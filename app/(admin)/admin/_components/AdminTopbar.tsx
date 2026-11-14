"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";

export default function AdminTopbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = q.trim();
    router.push(texto ? `/admin/productos?q=${encodeURIComponent(texto)}` : "/admin/productos");
  };

  return (
    <header className="sticky top-0 z-20 h-14 flex items-center gap-3 px-4 min-[861px]:px-6 bg-[var(--surface)] border-b border-[var(--line)]">
      <button onClick={onMenu} aria-label="Abrir menú" className="min-[861px]:hidden w-[38px] h-[38px] grid place-items-center rounded-[10px] border border-[var(--line)] flex-none">
        <Menu className="w-5 h-5" />
      </button>
      <form onSubmit={buscar} role="search" className="flex-1 max-w-[460px] flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2">
        <Search className="w-4 h-4 text-[var(--muted)] flex-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto"
          aria-label="Buscar producto"
          className="w-full bg-transparent outline-none text-sm"
        />
      </form>
      <span className="flex-1" />
      <Link href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:block flex-none rounded-[10px] border border-[var(--line)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--bg)] transition">
        Ver tienda ↗
      </Link>
    </header>
  );
}
