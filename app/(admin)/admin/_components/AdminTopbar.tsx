"use client";
import Link from "next/link";
import { Menu } from "lucide-react";

export default function AdminTopbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 h-14 flex items-center justify-between gap-3 px-4 min-[861px]:px-6 bg-[var(--surface)] border-b border-[var(--line)]">
      <button onClick={onMenu} aria-label="Abrir menú" className="min-[861px]:invisible w-[38px] h-[38px] grid place-items-center rounded-[10px] border border-[var(--line)]">
        <Menu className="w-5 h-5" />
      </button>
      <Link href="/" target="_blank" rel="noopener noreferrer" className="rounded-[10px] border border-[var(--line)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--bg)] transition">
        Ver tienda ↗
      </Link>
    </header>
  );
}
