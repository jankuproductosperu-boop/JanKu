"use client";

import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile (fase 26c, D-93). Carga el script de Cloudflare solo en la página que lo usa (registro,
// checkout, recuperar contraseña y Libro de Reclamaciones) y entrega el token al formulario. Modo "Managed" con
// apariencia "interaction-only": casi siempre no se ve nada; solo aparece si Cloudflare pide un clic.
// Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY (se lee al construir) no dibuja nada y los formularios siguen como antes.

const SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();
const URL_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** true si este build lleva la clave pública: el formulario espera el token antes de enviar. */
export const TURNSTILE_ACTIVO = SITE_KEY.length > 0;

/** Lo que ve quien envía antes de que llegue el token (normalmente tarda un segundo). */
export const MENSAJE_TURNSTILE_PENDIENTE =
  "Estamos comprobando tu navegador. Espera unos segundos e inténtalo de nuevo.";

type OpcionesWidget = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => boolean;
  "timeout-callback": () => void;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
  appearance: "interaction-only";
  language: string;
  theme: "light";
  size: "flexible";
};

type ApiTurnstile = {
  render(contenedor: HTMLElement, opciones: OpcionesWidget): string | null | undefined;
  reset(id: string): void;
  remove(id: string): void;
};

declare global {
  interface Window {
    turnstile?: ApiTurnstile;
  }
}

let carga: Promise<ApiTurnstile> | null = null;

/** Inserta el script una sola vez por página; si falla, el siguiente montaje lo vuelve a intentar. */
function cargarTurnstile(): Promise<ApiTurnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (carga) return carga;
  carga = new Promise<ApiTurnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = URL_SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      carga = null;
      script.remove();
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return carga;
}

type Props = {
  /** Token nuevo, o null cuando vence o falla (hay que esperar otro). */
  onToken: (token: string | null) => void;
  /** Al cambiar, pide un token nuevo: cada token vale una sola vez, así que se sube tras cada envío fallido. */
  reinicio: number;
};

export function Turnstile({ onToken, reinicio }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [interactivo, setInteractivo] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_ACTIVO) return;
    let vivo = true;
    cargarTurnstile()
      .then((api) => {
        if (!vivo || !contenedor.current) return;
        widget.current =
          api.render(contenedor.current, {
            sitekey: SITE_KEY,
            callback: (token) => {
              setFallo(false);
              onTokenRef.current(token);
            },
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => {
              setFallo(true);
              onTokenRef.current(null);
              return true; // manejado aquí; Cloudflare vuelve a intentar solo
            },
            "timeout-callback": () => onTokenRef.current(null),
            "before-interactive-callback": () => setInteractivo(true),
            "after-interactive-callback": () => setInteractivo(false),
            appearance: "interaction-only",
            language: "es",
            theme: "light",
            size: "flexible",
          }) ?? null;
      })
      .catch(() => {
        if (!vivo) return;
        setFallo(true);
        onTokenRef.current(null);
      });
    return () => {
      vivo = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (reinicio === 0 || !widget.current || !window.turnstile) return;
    window.turnstile.reset(widget.current);
  }, [reinicio]);

  if (!TURNSTILE_ACTIVO) return null;

  // Mientras no se ve nada, el envoltorio es "contents": no suma espacio entre los campos del formulario.
  const visible = interactivo || fallo;
  return (
    <div className={visible ? "space-y-2" : "contents"}>
      <div ref={contenedor} />
      {fallo && (
        <p role="alert" className="text-sm text-red-600">
          No pudimos completar la verificación de seguridad. Revisa tu conexión y recarga la página.
        </p>
      )}
    </div>
  );
}
