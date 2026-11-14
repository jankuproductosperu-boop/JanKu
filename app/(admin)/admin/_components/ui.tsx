// Piezas visuales repetidas del panel. Solo presentación, sin lógica.

export type Tono = "ok" | "aviso" | "malo" | "acento";

const TONOS: Record<Tono, string> = {
  ok: "bg-green-100 text-green-700",
  aviso: "bg-amber-100 text-amber-700",
  malo: "bg-red-100 text-red-700",
  acento: "bg-indigo-100 text-indigo-700",
};

export function Chip({ tono, children }: { tono: Tono; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONOS[tono]}`}>
      {children}
    </span>
  );
}

export function Switch({ activo, onChange, etiqueta }: { activo: boolean; onChange: (v: boolean) => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onChange(!activo)}
      className={`relative inline-block w-9 h-5 rounded-full transition flex-none ${activo ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function PageHeader({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: string; acciones?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">{titulo}</h1>
        {subtitulo && <p className="text-sm text-[var(--muted)] mt-0.5">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
