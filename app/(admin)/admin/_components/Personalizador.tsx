"use client";
import { useEffect } from "react";
import { Check, Settings, X } from "lucide-react";
import { fijarTema, useTema, type Tema } from "@/app/(admin)/admin/_components/useTema";
import {
  usePreferenciasPanel,
  type AnchoPanel,
  type ColorBarra,
  type TamanoBarra,
} from "@/app/(admin)/admin/_components/usePreferenciasPanel";

// Personalizador del panel (fase 23a, Q1). Las elecciones se guardan solo en este navegador (D-83).

type Opcion<T extends string> = { valor: T; etiqueta: string; muestra: React.ReactNode };

/** Miniatura del panel: barra lateral a la izquierda y contenido a la derecha. */
function Mini({
  barra = "#263070",
  fondo = "#f3f3f9",
  tarjeta = "#ffffff",
  anchoBarra = 26,
  caja = false,
}: {
  barra?: string;
  fondo?: string;
  tarjeta?: string;
  anchoBarra?: number;
  caja?: boolean;
}) {
  return (
    <div className="h-[58px] w-full rounded-md overflow-hidden flex border border-black/10" style={{ background: fondo }} aria-hidden="true">
      <div className={`flex w-full ${caja ? "mx-3 border-x border-black/10" : ""}`}>
        <div style={{ width: anchoBarra, background: barra }} className="flex-none flex flex-col gap-1 p-1.5">
          <span className="block h-1.5 rounded bg-white/50" />
          <span className="block h-1 rounded bg-white/30" />
          <span className="block h-1 rounded bg-white/30" />
        </div>
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          <span className="block h-2 rounded" style={{ background: tarjeta }} />
          <span className="block flex-1 rounded" style={{ background: tarjeta }} />
        </div>
      </div>
    </div>
  );
}

function Grupo<T extends string>({
  titulo,
  ayuda,
  opciones,
  valor,
  onCambio,
}: {
  titulo: string;
  ayuda: string;
  opciones: Opcion<T>[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-bold uppercase tracking-wide text-[var(--ink)]">{titulo}</legend>
      <p className="text-xs text-[var(--muted)] -mt-1">{ayuda}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {opciones.map((o) => {
          const elegido = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => onCambio(o.valor)}
              aria-pressed={elegido}
              className={`relative rounded-lg border p-1.5 text-center transition ${
                elegido ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25" : "border-[var(--line)] hover:border-[var(--muted)]"
              }`}
            >
              {o.muestra}
              <span className="mt-1.5 block text-xs font-semibold">{o.etiqueta}</span>
              {elegido && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--accent)] text-white grid place-items-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BotonPersonalizador({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label="Personalizar el panel"
      title="Personalizar el panel"
      className="engranaje fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-[var(--accent)] text-white grid place-items-center shadow-lg hover:brightness-110 transition"
    >
      <Settings className="w-5 h-5" />
    </button>
  );
}

export default function Personalizador({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { tema } = useTema();
  const p = usePreferenciasPanel();

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const temas: Opcion<Tema>[] = [
    { valor: "claro", etiqueta: "Claro", muestra: <Mini /> },
    { valor: "oscuro", etiqueta: "Oscuro", muestra: <Mini barra="#1c1f23" fondo="#141619" tarjeta="#24282d" /> },
  ];
  const tamanos: Opcion<TamanoBarra>[] = [
    { valor: "normal", etiqueta: "Normal", muestra: <Mini /> },
    { valor: "compacta", etiqueta: "Compacta", muestra: <Mini anchoBarra={16} /> },
    { valor: "iconos", etiqueta: "Solo iconos", muestra: <Mini anchoBarra={10} /> },
  ];
  const colores: Opcion<ColorBarra>[] = [
    { valor: "azul", etiqueta: "Azul Janku", muestra: <Mini /> },
    { valor: "blanca", etiqueta: "Blanca", muestra: <Mini barra="#ffffff" /> },
    { valor: "degradado", etiqueta: "Degradado", muestra: <Mini barra="linear-gradient(165deg,#263070,#3552ad)" /> },
  ];
  const anchos: Opcion<AnchoPanel>[] = [
    { valor: "completo", etiqueta: "Completo", muestra: <Mini /> },
    { valor: "centrado", etiqueta: "Centrado", muestra: <Mini caja /> },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onCerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="personalizador-titulo"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[380px] bg-[var(--surface)] text-[var(--ink)] shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 h-[70px] flex-none bg-gradient-to-r from-[#263070] to-[#3552ad] text-white">
          <h2 id="personalizador-titulo" className="text-lg font-semibold">Personalizar el panel</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">
          <Grupo titulo="Tema" ayuda="Claro u oscuro." opciones={temas} valor={tema} onCambio={fijarTema} />
          <Grupo titulo="Tamaño de la barra" ayuda="En el celular la barra siempre se abre completa." opciones={tamanos} valor={p.tamanoBarra} onCambio={p.setTamanoBarra} />
          <Grupo titulo="Color de la barra" ayuda="Color de la barra lateral." opciones={colores} valor={p.colorBarra} onCambio={p.setColorBarra} />
          <Grupo titulo="Ancho" ayuda="«Centrado» solo se nota en pantallas muy anchas." opciones={anchos} valor={p.ancho} onCambio={p.setAncho} />
          <p className="text-xs text-[var(--muted)]">Estas opciones se guardan solo en este navegador.</p>
        </div>

        <div className="flex gap-3 p-4 border-t border-[var(--line)] flex-none">
          <button onClick={p.restablecer} className="flex-1 rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--bg)] transition">
            Restablecer
          </button>
          <button onClick={onCerrar} className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition">
            Listo
          </button>
        </div>
      </div>
    </>
  );
}
