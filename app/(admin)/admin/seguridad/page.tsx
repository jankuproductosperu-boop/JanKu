"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { encode } from "uqr";
import { AlertTriangle, Copy, KeyRound, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import type { SeguridadEstado, SeguridadInicio } from "@/types";
import { agruparSecreto } from "@/lib/totp";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { Chip } from "@/app/(admin)/admin/_components/ui";

// Fase 26b: verificación en dos pasos de la cuenta propia. La autoridad es la API: aquí solo se
// guía. El QR se dibuja en el navegador a partir del enlace otpauth://; nada sale a otro servicio.
// La contraseña y los códigos se borran del estado en cuanto responde el servidor.

const claseInput =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60";
const claseTarjeta = "max-w-2xl space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-6";
const claseBoton =
  "inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60";
const claseBotonSecundario =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-60";

type Respuesta = { error?: string; code?: string };

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

async function enviar<T>(url: string, cuerpo: unknown): Promise<{ ok: true; datos: T } | { ok: false; error: string; code?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const datos: unknown = await res.json().catch(() => null);
    if (res.ok) return { ok: true, datos: datos as T };
    const r = (datos ?? {}) as Respuesta;
    return { ok: false, error: r.error || "No se pudo completar la acción", code: r.code };
  } catch {
    return { ok: false, error: "Error de conexión" };
  }
}

/** QR en SVG con React (sin innerHTML). Fondo blanco siempre, también en tema oscuro. */
function CodigoQr({ texto }: { texto: string }) {
  const { tamano, trazo } = useMemo(() => {
    const qr = encode(texto, { ecc: "M", border: 4 });
    let d = "";
    qr.data.forEach((fila, y) => fila.forEach((negro, x) => { if (negro) d += `M${x} ${y}h1v1h-1z`; }));
    return { tamano: qr.size, trazo: d };
  }, [texto]);
  return (
    <svg
      viewBox={`0 0 ${tamano} ${tamano}`}
      width={208}
      height={208}
      role="img"
      aria-label="Código QR para escanear con la app de autenticación"
      shapeRendering="crispEdges"
      className="rounded-lg border border-[var(--line)]"
    >
      <rect width={tamano} height={tamano} fill="#ffffff" />
      <path d={trazo} fill="#000000" />
    </svg>
  );
}

function ListaCodigos({ codigos, onListo }: { codigos: string[]; onListo: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const [guardados, setGuardados] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigos.join("\n"));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };
  return (
    <div className={claseTarjeta}>
      <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--ink)]">
        <KeyRound className="w-5 h-5" /> Tus códigos de rescate
      </h2>
      <p className="text-sm text-[var(--muted)]">
        Si pierdes el celular, cada código te deja entrar <strong>una sola vez</strong> en lugar del código de la app.
        Guárdalos en un lugar seguro (papel o gestor de contraseñas). <strong>No se vuelven a mostrar.</strong>
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-[15px] text-[var(--ink)]">
        {codigos.map((c) => (
          <li key={c} className="rounded-md border border-[var(--line)] px-3 py-2 text-center tracking-wider">{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copiar} className={claseBotonSecundario}>
          <Copy className="w-4 h-4" /> {copiado ? "Copiados" : "Copiar"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
        <input type="checkbox" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} />
        Ya guardé mis códigos
      </label>
      <button type="button" disabled={!guardados} onClick={onListo} className={claseBoton}>
        Listo
      </button>
    </div>
  );
}

/** Contraseña + código (de la app o de rescate) para desactivar o regenerar. */
function FormVerificar({
  titulo,
  descripcion,
  boton,
  peligro,
  onEnviar,
  onCancelar,
}: {
  titulo: string;
  descripcion: string;
  boton: string;
  peligro?: boolean;
  onEnviar: (password: string, codigo: string) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviarForm = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const err = await onEnviar(password, codigo);
    setPassword("");
    setCodigo("");
    setEnviando(false);
    if (err) setError(err);
  };
  return (
    <form onSubmit={enviarForm} noValidate className={claseTarjeta}>
      <h2 className="text-lg font-bold text-[var(--ink)]">{titulo}</h2>
      <p className="text-sm text-[var(--muted)]">{descripcion}</p>
      <div>
        <label htmlFor="sg-v-pass" className="block text-sm font-medium text-[var(--ink)] mb-1">Tu contraseña</label>
        <input id="sg-v-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={200} className={claseInput} />
      </div>
      <div>
        <label htmlFor="sg-v-cod" className="block text-sm font-medium text-[var(--ink)] mb-1">Código de la app o de rescate</label>
        <input id="sg-v-cod" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="one-time-code" maxLength={32} className={claseInput} />
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={enviando || !password || !codigo.trim()}
          className={peligro ? "inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" : claseBoton}
        >
          {enviando ? "Verificando..." : boton}
        </button>
        <button type="button" onClick={onCancelar} className={claseBotonSecundario}>Cancelar</button>
      </div>
    </form>
  );
}

export default function SeguridadPage() {
  const [estado, setEstado] = useState<SeguridadEstado | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [recarga, setRecarga] = useState(0);

  // Activación
  const [password, setPassword] = useState("");
  const [inicio, setInicio] = useState<SeguridadInicio | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigosNuevos, setCodigosNuevos] = useState<string[] | null>(null);
  const [verClave, setVerClave] = useState(false);

  // Con la 2FA activa
  const [accion, setAccion] = useState<"desactivar" | "regenerar" | null>(null);
  const [exito, setExito] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/admin/seguridad", { cache: "no-store" });
        const cuerpo: unknown = await res.json().catch(() => null);
        if (!activo) return;
        if (!res.ok || !cuerpo) {
          setErrorCarga("No se pudo cargar el estado de la verificación en dos pasos");
          return;
        }
        setErrorCarga("");
        setEstado(cuerpo as SeguridadEstado);
      } catch {
        if (activo) setErrorCarga("Error de conexión");
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [recarga]);

  const empezar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const r = await enviar<SeguridadInicio>("/api/admin/seguridad/iniciar", { password });
    setPassword("");
    setEnviando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setInicio(r.datos);
  };

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const r = await enviar<{ codigosRescate: string[] }>("/api/admin/seguridad/confirmar", { codigo });
    setCodigo("");
    setEnviando(false);
    if (!r.ok) {
      if (r.code === "2FA_PENDIENTE_VENCIDA") setInicio(null);
      setError(r.error);
      return;
    }
    setInicio(null);
    setCodigosNuevos(r.datos.codigosRescate);
  };

  // Tras activar o desactivar cambia lo que el panel deja abrir: se recarga entero.
  const recargarPanel = (ruta: string) => window.location.assign(ruta);

  const desactivar = async (pass: string, cod: string) => {
    const r = await enviar<SeguridadEstado>("/api/admin/seguridad/desactivar", { password: pass, codigo: cod });
    if (!r.ok) return r.error;
    setAccion(null);
    if (r.datos.obligatoria) {
      recargarPanel("/admin/seguridad");
      return null;
    }
    setEstado(r.datos);
    setExito("Verificación en dos pasos desactivada. Se cerraron tus otras sesiones.");
    return null;
  };

  const regenerar = async (pass: string, cod: string) => {
    const r = await enviar<{ codigosRescate: string[] }>("/api/admin/seguridad/codigos-rescate", { password: pass, codigo: cod });
    if (!r.ok) return r.error;
    setAccion(null);
    setCodigosNuevos(r.datos.codigosRescate);
    return null;
  };

  if (errorCarga) {
    return (
      <Seccion titulo="Seguridad">
        <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-[var(--muted)]">{errorCarga}</p>
      </Seccion>
    );
  }
  if (!estado) {
    return (
      <Seccion titulo="Seguridad">
        <p className="text-[var(--muted)]">Cargando…</p>
      </Seccion>
    );
  }

  // ── Códigos recién creados (al activar o al regenerar) ───────────────────
  if (codigosNuevos) {
    return (
      <Seccion titulo="Seguridad">
        <ListaCodigos
          codigos={codigosNuevos}
          onListo={() => {
            const eraActivacion = !estado.activo;
            setCodigosNuevos(null);
            if (eraActivacion) recargarPanel("/admin");
            else {
              setExito("Códigos de rescate nuevos listos. Los anteriores ya no sirven.");
              setRecarga((n) => n + 1);
            }
          }}
        />
      </Seccion>
    );
  }

  return (
    <Seccion titulo="Seguridad">
      <p className="-mt-4 text-[var(--muted)]">
        Verificación en dos pasos: además de la contraseña, el panel te pide un código de 6 dígitos de una app como
        Google Authenticator o Microsoft Authenticator.
      </p>

      {exito && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">{exito}</p>}

      {estado.activo ? (
        <>
          <div className={claseTarjeta}>
            <div className="flex flex-wrap items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-bold text-[var(--ink)]">Activa</h2>
              <Chip tono="ok">Protegida</Chip>
            </div>
            {estado.activadoEn && <p className="text-sm text-[var(--muted)]">Desde el {fecha(estado.activadoEn)}.</p>}
            <p className="text-sm text-[var(--ink)]">
              Códigos de rescate sin usar: <strong>{estado.codigosRestantes}</strong> de 8.
            </p>
            {estado.codigosRestantes <= 2 && (
              <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-none" /> Te quedan pocos códigos de rescate: genera unos nuevos.
              </p>
            )}
            {!accion && (
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => { setExito(""); setAccion("regenerar"); }} className={claseBotonSecundario}>
                  <KeyRound className="w-4 h-4" /> Nuevos códigos de rescate
                </button>
                <button type="button" onClick={() => { setExito(""); setAccion("desactivar"); }} className={claseBotonSecundario}>
                  <ShieldOff className="w-4 h-4" /> {estado.obligatoria ? "Cambiar de celular" : "Desactivar"}
                </button>
              </div>
            )}
          </div>

          {accion === "regenerar" && (
            <FormVerificar
              titulo="Nuevos códigos de rescate"
              descripcion="Se crean 8 códigos nuevos y los anteriores dejan de servir."
              boton="Generar códigos"
              onEnviar={regenerar}
              onCancelar={() => setAccion(null)}
            />
          )}
          {accion === "desactivar" && (
            <FormVerificar
              titulo={estado.obligatoria ? "Cambiar de celular" : "Desactivar la verificación en dos pasos"}
              descripcion={
                estado.obligatoria
                  ? "Como superadministrador es obligatoria: al confirmar se desactiva y el panel te pide configurarla de nuevo con el celular nuevo. Se cierran tus otras sesiones."
                  : "Tu cuenta quedará protegida solo con la contraseña. Se cierran tus otras sesiones."
              }
              boton={estado.obligatoria ? "Configurar de nuevo" : "Desactivar"}
              peligro
              onEnviar={desactivar}
              onCancelar={() => setAccion(null)}
            />
          )}
        </>
      ) : !estado.disponible ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          La verificación en dos pasos aún no está configurada en el servidor (falta la variable TOTP_ENC_KEY).
          {estado.obligatoria && " Mientras tanto el panel no se puede usar con una cuenta de superadministrador."}
        </p>
      ) : (
        <>
          {estado.obligatoria && (
            <p role="alert" className="flex items-center gap-2 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-none" />
              Como superadministrador, debes activarla para seguir usando el panel.
            </p>
          )}

          {!inicio ? (
            <form onSubmit={empezar} noValidate className={claseTarjeta}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--ink)]">
                <Smartphone className="w-5 h-5" /> Activar
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Instala en tu celular Google Authenticator, Microsoft Authenticator u otra app de códigos. Luego confirma tu
                contraseña para empezar.
              </p>
              <div>
                <label htmlFor="sg-pass" className="block text-sm font-medium text-[var(--ink)] mb-1">Tu contraseña</label>
                <input id="sg-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={200} className={claseInput} />
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={enviando || !password} className={claseBoton}>
                {enviando ? "Verificando..." : "Empezar"}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmar} noValidate className={claseTarjeta}>
              <h2 className="text-lg font-bold text-[var(--ink)]">Escanea el código</h2>
              <ol className="list-decimal pl-5 text-sm text-[var(--muted)] space-y-1">
                <li>En la app, elige “Agregar cuenta” y “Escanear código QR”.</li>
                <li>Escribe aquí el código de 6 dígitos que aparece. Tienes 10 minutos.</li>
              </ol>
              <div className="flex flex-wrap items-start gap-6">
                <CodigoQr texto={inicio.uri} />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <button type="button" onClick={() => setVerClave((v) => !v)} className="text-[var(--accent)] underline">
                    {verClave ? "Ocultar la clave" : "¿No puedes escanear? Escribe la clave"}
                  </button>
                  {verClave && (
                    <p className="break-all rounded-md border border-[var(--line)] px-3 py-2 font-mono tracking-wider text-[var(--ink)]">
                      {agruparSecreto(inicio.secreto)}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="sg-cod" className="block text-sm font-medium text-[var(--ink)] mb-1">Código de 6 dígitos</label>
                <input
                  id="sg-cod"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  placeholder="123456"
                  className={`${claseInput} max-w-[12rem] font-mono tracking-widest`}
                />
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={enviando || codigo.trim().length < 6} className={claseBoton}>
                  {enviando ? "Verificando..." : "Activar"}
                </button>
                <button type="button" onClick={() => { setInicio(null); setError(""); }} className={claseBotonSecundario}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </Seccion>
  );
}
