"use client";
import { useEffect, useMemo, useState } from "react";
import { escalaDeColor, escalaProporcional, idDeRegionPeru, radioMarcador, ubicarEnMapa } from "@/lib/mapas";

// Mapa de visitas (fase 23d, D-94): el Perú por departamentos, el zoom de Lima (Lima Metropolitana, Callao y
// Lima Provincias) o el mundo por países, dibujado en SVG sin librerías. La geometría (Natural Earth, generada
// con scripts/mapas/generar-mapas.mjs) se pide con import() al elegir la vista: ninguna otra pantalla la
// descarga y la tienda tampoco.

export type VistaMapa = "peru" | "lima" | "mundo";

type Forma = { id: string; nombre: string; d: string; x: number; y: number };
/** `huancayo` es null cuando la ciudad queda fuera del encuadre (zoom de Lima). */
type Geometria = { ancho: number; alto: number; huancayo: number[] | null; formas: Forma[] };

const CARGAR: Record<VistaMapa, () => Promise<Geometria>> = {
  peru: () => import("./peru.json").then((m) => m.default),
  lima: () => import("./lima.json").then((m) => m.default),
  mundo: () => import("./mundo.json").then((m) => m.default),
};

/** Píxeles que ocupa más o menos el lado mayor de cada mapa en la tarjeta: puntos y marcadores miden igual en todas las vistas. */
const LADO_PX: Record<VistaMapa, number> = { peru: 300, lima: 300, mundo: 480 };
/** Opacidad del tinte por escalón de visitas (0 = sin visitas). */
const OPACIDAD = [0, 0.16, 0.28, 0.42, 0.58, 0.75];
const CORAL = "#f06548";

const miles = (n: number) => n.toLocaleString("es-PE");
const usuarios = (n: number) => `${miles(n)} ${n === 1 ? "usuario" : "usuarios"}`;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Curva suave de Huancayo al marcador, abombada hacia arriba. */
function arco(x1: number, y1: number, x2: number, y2: number): string {
  let nx = y1 - y2;
  let ny = x2 - x1;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const cx = (x1 + x2) / 2 + nx * 0.18;
  const cy = (y1 + y2) / 2 + ny * 0.18;
  return `M${x1} ${y1}Q${r1(cx)} ${r1(cy)} ${x2} ${y2}`;
}

type Props = {
  vista: VistaMapa;
  /** Filas de Google: nombre de región (Perú) o código de país (mundo), con sus usuarios. */
  filas: { clave: string; usuarios: number }[];
  /** Nombre visible de una clave de Google (para el mundo y para «Sin ubicar»). */
  nombreDe: (clave: string) => string;
};

export function MapaVisitas({ vista, filas, nombreDe }: Props) {
  const [geo, setGeo] = useState<{ vista: VistaMapa; datos: Geometria | null } | null>(null);
  const [tip, setTip] = useState<{ vista: VistaMapa; id: string; x: number; y: number; abajo: boolean } | null>(null);

  useEffect(() => {
    let activo = true;
    CARGAR[vista]()
      .then((datos) => {
        if (activo) setGeo({ vista, datos });
      })
      .catch(() => {
        if (activo) setGeo({ vista, datos: null });
      });
    return () => {
      activo = false;
    };
  }, [vista]);

  const cargado = geo?.vista === vista ? geo : null;
  const datos = cargado?.datos ?? null;
  const u = datos ? Math.max(datos.ancho, datos.alto) / LADO_PX[vista] : 1; // unidades del viewBox por píxel

  const calculo = useMemo(() => {
    if (!datos) return null;
    const ids = new Set(datos.formas.map((f) => f.id).filter(Boolean));
    const idDe = vista === "mundo" ? (c: string) => c || null : idDeRegionPeru;
    // El zoom de Lima solo muestra sus tres zonas: el resto del Perú y lo que no se ubica ya salen en la vista Perú.
    const filasVista =
      vista === "lima"
        ? filas.filter((f) => {
            const id = idDeRegionPeru(f.clave);
            return id !== null && ids.has(id);
          })
        : filas;
    const { porId, sinUbicar } = ubicarEnMapa(filasVista, idDe, ids);
    const valores = Object.values(porId);
    return {
      porId,
      sinUbicar,
      // Con 3 zonas los cuantiles no sirven: en Lima el tinte va en proporción al mayor.
      escala: vista === "lima" ? escalaProporcional(valores) : escalaDeColor(valores),
      mayor: Math.max(0, ...valores),
      total: valores.reduce((s, v) => s + v, 0),
      lugares: valores.length,
    };
  }, [datos, filas, vista]);

  // El dibujo no cambia al mover el ratón: solo el aviso, que va aparte.
  const dibujo = useMemo(() => {
    if (!datos || !calculo) return null;
    const paso = 5 * u;
    const origen = datos.huancayo;
    const patron = `mapa-puntos-${vista}`;
    const conVisitas = datos.formas
      .filter((f) => f.id && calculo.porId[f.id])
      .map((f) => ({ f, n: calculo.porId[f.id], r: radioMarcador(calculo.porId[f.id], calculo.mayor) * u }))
      .sort((a, b) => b.n - a.n);
    return (
      <svg
        viewBox={`0 0 ${datos.ancho} ${datos.alto}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        role="img"
        aria-label={
          vista === "peru"
            ? "Mapa del Perú con los usuarios por departamento"
            : vista === "lima"
              ? "Mapa de Lima Metropolitana, el Callao y Lima Provincias con sus usuarios"
              : "Mapa del mundo con los usuarios por país"
        }
      >
        <defs>
          <pattern id={patron} width={paso} height={paso} patternUnits="userSpaceOnUse">
            <circle cx={paso / 2} cy={paso / 2} r={paso * 0.27} fill="var(--muted)" fillOpacity={0.55} />
          </pattern>
        </defs>
        <g fillRule="evenodd">
          {datos.formas.map((f, i) => (
            <path
              key={f.id || `sin-id-${i}`}
              d={f.d}
              data-id={f.id || undefined}
              fill={`url(#${patron})`}
              style={vista !== "mundo" ? { stroke: "color-mix(in srgb, var(--muted) 30%, transparent)", strokeWidth: 0.8 * u } : undefined}
            />
          ))}
          {conVisitas.map(({ f, n }) => (
            <path key={f.id} d={f.d} data-id={f.id} fill="var(--accent)" fillOpacity={OPACIDAD[calculo.escala(n)]} />
          ))}
        </g>
        {origen && (
          <g
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.45}
            strokeWidth={u}
            strokeDasharray={`${2.5 * u} ${2.5 * u}`}
            strokeLinecap="round"
            pointerEvents="none"
          >
            {conVisitas.map(({ f, r }) =>
              Math.hypot(f.x - origen[0], f.y - origen[1]) > r + 4 * u ? (
                <path key={f.id} d={arco(origen[0], origen[1], f.x, f.y)} />
              ) : null,
            )}
          </g>
        )}
        {conVisitas.map(({ f, r }) => (
          <g key={f.id}>
            <circle
              cx={f.x}
              cy={f.y}
              r={r}
              data-id={f.id}
              fill="var(--accent)"
              fillOpacity={0.22}
              stroke="var(--accent)"
              strokeOpacity={0.45}
              strokeWidth={u}
            />
            <circle cx={f.x} cy={f.y} r={r * 0.45} data-id={f.id} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.2 * u} />
          </g>
        ))}
        {origen && (
          <circle cx={origen[0]} cy={origen[1]} r={3.5 * u} data-id="huancayo" fill={CORAL} stroke="var(--surface)" strokeWidth={1.5 * u} />
        )}
      </svg>
    );
  }, [datos, calculo, vista, u]);

  const nombreForma = (f: Forma) => (vista === "mundo" && f.id ? nombreDe(f.id) : f.nombre);

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    const id = e.target instanceof Element ? e.target.getAttribute("data-id") : null;
    if (!id) {
      setTip(null);
      return;
    }
    const caja = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - caja.left, 70), Math.max(70, caja.width - 70));
    const y = e.clientY - caja.top;
    setTip({ vista, id, x, y, abajo: y < 44 });
  };

  const activa = tip?.vista === vista && datos ? datos.formas.find((f) => f.id === tip.id) : undefined;
  const textoTip =
    tip?.vista !== vista || !calculo
      ? null
      : tip.id === "huancayo"
        ? "Huancayo · tu tienda"
        : activa
          ? `${nombreForma(activa)} · ${usuarios(calculo.porId[activa.id] ?? 0)}`
          : null;

  return (
    <div>
      <div
        className="relative h-[260px] sm:h-[300px] touch-manipulation"
        onPointerMove={mover}
        onPointerDown={mover}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setTip(null);
        }}
      >
        {!cargado ? (
          <p className="h-full grid place-items-center text-sm text-[var(--muted)]">Cargando mapa…</p>
        ) : !datos ? (
          <p className="h-full grid place-items-center text-sm text-[var(--muted)]">No se pudo cargar el mapa.</p>
        ) : (
          <>
            {dibujo}
            {activa && (
              <svg
                viewBox={`0 0 ${datos.ancho} ${datos.alto}`}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                <path d={activa.d} fill="none" fillRule="evenodd" stroke="var(--accent)" strokeWidth={1.5 * u} />
              </svg>
            )}
          </>
        )}
        {tip && textoTip && (
          <div
            className={`pointer-events-none absolute z-10 -translate-x-1/2 rounded-md bg-[var(--ink)] px-2 py-1 text-xs font-medium text-[var(--surface)] shadow whitespace-nowrap ${
              tip.abajo ? "mt-4" : "-translate-y-full -mt-2.5"
            }`}
            style={{ left: tip.x, top: tip.y }}
          >
            {textoTip}
          </div>
        )}
      </div>
      {calculo && (
        <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
          <p>
            {calculo.lugares === 0
              ? vista === "lima"
                ? "Aún no hay visitas de Lima ni del Callao en este periodo."
                : "Aún no hay visitas ubicadas en este periodo."
              : vista === "lima"
                ? `${usuarios(calculo.total)} en Lima y el Callao`
                : `${usuarios(calculo.total)} en ${calculo.lugares} ${
                    vista === "peru"
                      ? calculo.lugares === 1
                        ? "departamento"
                        : "departamentos"
                      : calculo.lugares === 1
                        ? "país"
                        : "países"
                  }`}
          </p>
          {calculo.sinUbicar.length > 0 && (
            <p>
              Sin ubicar en el mapa: {calculo.sinUbicar.map((s) => `${nombreDe(s.clave)} (${miles(s.usuarios)})`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
