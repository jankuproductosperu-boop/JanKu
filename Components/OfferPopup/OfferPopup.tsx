"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { debeMostrarPopup, type CierrePopup } from "@/lib/popup";
import type { PopupPublico } from "@/types";

const CLAVE_CIERRE = "popup-oferta-cierre";

function leerCierre(): CierrePopup | null {
  try {
    const bruto = localStorage.getItem(CLAVE_CIERRE);
    return bruto ? (JSON.parse(bruto) as CierrePopup) : null;
  } catch {
    return null;
  }
}

function guardarCierre(version: string) {
  try {
    localStorage.setItem(CLAVE_CIERRE, JSON.stringify({ version, en: Date.now() }));
  } catch {
    /* sin almacenamiento: puede volver a salir en la próxima visita */
  }
}

export default function OfferPopup() {
  const [popup, setPopup] = useState<PopupPublico | null>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);

  // Consulta el popup vigente; si existe y no se cerró hace poco, lo muestra tras una breve pausa.
  useEffect(() => {
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    fetch("/api/popup", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((p: PopupPublico | null) => {
        if (!activo || !p || !p.imagenUrl || !p.enlace) return;
        if (!debeMostrarPopup(leerCierre(), p.version)) return;
        temporizador = setTimeout(() => { if (activo) setPopup(p); }, 800);
      })
      .catch(() => { /* sin popup: la tienda carga normal */ });
    return () => {
      activo = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, []);

  const cerrar = () => {
    if (popup) guardarCierre(popup.version);
    setPopup(null);
  };

  // Esc para cerrar, foco en el botón de cierre y sin desplazamiento de fondo mientras está abierto.
  useEffect(() => {
    if (!popup) return;
    const version = popup.version;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        guardarCierre(version);
        setPopup(null);
      }
    };
    document.addEventListener("keydown", alPulsar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botonCerrar.current?.focus();
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [popup]);

  if (!popup) return null;

  const externo = popup.enlace.startsWith("http");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"
      onClick={cerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Oferta"
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={botonCerrar}
          onClick={cerrar}
          aria-label="Cerrar oferta"
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
        <Image
          src={popup.imagenUrl}
          alt="Oferta"
          width={840}
          height={840}
          sizes="(max-width: 460px) 90vw, 420px"
          className="h-auto w-full"
          priority
        />
        <div className="p-3">
          {externo ? (
            <a
              href={popup.enlace}
              target="_blank"
              rel="noopener noreferrer"
              onClick={cerrar}
              className="block w-full rounded-xl bg-[#2C2C6C] py-3 text-center font-bold text-white transition hover:bg-[#241B57]"
            >
              {popup.textoBoton}
            </a>
          ) : (
            <Link
              href={popup.enlace}
              onClick={cerrar}
              className="block w-full rounded-xl bg-[#2C2C6C] py-3 text-center font-bold text-white transition hover:bg-[#241B57]"
            >
              {popup.textoBoton}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
