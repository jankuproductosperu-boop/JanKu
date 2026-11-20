import Link from "next/link";

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

/** Cabecera de cada pantalla (fase 23a): título en mayúsculas y la ruta a la derecha. */
export function PageHeader({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: string; acciones?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[17px] font-bold uppercase tracking-wide text-[var(--ink)]">{titulo}</h1>
        {subtitulo && <p className="text-sm text-[var(--muted)] mt-0.5">{subtitulo}</p>}
      </div>
      {acciones ? (
        <div className="flex flex-wrap gap-2">{acciones}</div>
      ) : (
        <nav aria-label="Ruta" className="hidden sm:block text-sm">
          <span className="text-[var(--ink)]">Panel</span>
          <span className="mx-2 text-[var(--muted)]">›</span>
          <span className="text-[var(--muted)]">{titulo}</span>
        </nav>
      )}
    </div>
  );
}

/** Tarjeta de indicador del Resumen (fase 23a): etiqueta, cifra grande, detalle e icono en círculo suave. */
export function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono: Icono,
  tono = "acento",
  href,
}: {
  titulo: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  icono: React.ComponentType<{ className?: string }>;
  tono?: Tono;
  href?: string;
}) {
  const circulo: Record<Tono, string> = {
    ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
    aviso: "bg-[var(--warn-soft)] text-[var(--warn)]",
    malo: "bg-[var(--bad-soft)] text-[var(--bad)]",
    acento: "bg-[var(--accent-soft)] text-[var(--accent)]",
  };
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium uppercase tracking-wide text-[var(--muted)]">{titulo}</span>
        <span className={`w-12 h-12 rounded-full grid place-items-center flex-none ${circulo[tono]}`}>
          <Icono className="w-[22px] h-[22px]" />
        </span>
      </div>
      <div className="-mt-2 text-[28px] font-semibold leading-tight tracking-tight text-[var(--ink)]">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-[var(--muted)]">{detalle}</div>}
    </>
  );
  const clase = "block rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm min-w-0 transition";
  return href ? (
    <Link href={href} className={`${clase} hover:shadow-md hover:-translate-y-0.5`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
