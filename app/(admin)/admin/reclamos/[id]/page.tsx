"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Complaint, TipoDocumento } from "@/types";
import { diasHabilesRestantes } from "@/lib/diasHabiles";
import { formatearSoles } from "@/lib/money";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { Chip } from "@/app/(admin)/admin/_components/ui";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

const DOCUMENTO: Record<TipoDocumento, string> = { DNI: "DNI", CE: "Carné de extranjería", PASAPORTE: "Pasaporte" };

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", dateStyle: "long" });

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
      <h2 className="font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{etiqueta}</dt>
      <dd className="text-sm whitespace-pre-line break-words">{children}</dd>
    </div>
  );
}

function textoPlazo(dias: number): string {
  if (dias < 0) return `Vencido hace ${-dias} día${dias === -1 ? "" : "s"} hábil${dias === -1 ? "" : "es"}`;
  if (dias === 0) return "Vence hoy";
  return `Quedan ${dias} día${dias === 1 ? "" : "s"} hábil${dias === 1 ? "" : "es"}`;
}

type Carga = { hoja: Complaint; ahora: Date } | { error: string };

export default function ReclamoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { puede } = useAdminSession();
  const [carga, setCarga] = useState<Carga | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "malo"; texto: string } | null>(null);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch(`/api/admin/complaints/${encodeURIComponent(id)}`);
        const cuerpo = await res.json().catch(() => ({}));
        if (!activo) return;
        if (!res.ok) setCarga({ error: cuerpo.error || "No se pudo cargar el reclamo" });
        else setCarga({ hoja: cuerpo as Complaint, ahora: new Date() });
      } catch {
        if (activo) setCarga({ error: "Error de conexión al cargar el reclamo" });
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [id, recarga]);

  const responder = async (e: FormEvent) => {
    e.preventDefault();
    const texto = respuesta.trim();
    if (texto.length < 10) {
      setAviso({ tono: "malo", texto: "Escribe al menos 10 caracteres." });
      return;
    }
    if (!confirm("La respuesta se enviará al correo del consumidor y no se podrá cambiar. ¿Enviar?")) return;
    setEnviando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/admin/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta: texto }),
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (res.ok) {
        setCarga({ hoja: cuerpo as Complaint, ahora: new Date() });
        setRespuesta("");
        setAviso({ tono: "ok", texto: "Respuesta guardada. Se está enviando al correo del consumidor." });
      } else if (res.status === 409) {
        setAviso({ tono: "malo", texto: "Este reclamo ya fue respondido por otra persona." });
        setRecarga((n) => n + 1);
      } else {
        const campo = cuerpo.fields?.respuesta as string | undefined;
        setAviso({ tono: "malo", texto: campo || cuerpo.error || "No se pudo guardar la respuesta" });
      }
    } catch {
      setAviso({ tono: "malo", texto: "Error de conexión al guardar la respuesta" });
    } finally {
      setEnviando(false);
    }
  };

  if (!carga) {
    return (
      <Seccion titulo="Reclamo">
        <p className="text-[var(--muted)]">Cargando…</p>
      </Seccion>
    );
  }
  if ("error" in carga) {
    return (
      <Seccion titulo="Reclamo">
        <p role="alert" className="text-red-600">{carga.error}</p>
        <Link href="/admin/reclamos" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          ← Volver a reclamos
        </Link>
      </Seccion>
    );
  }

  const h = carga.hoja;
  const dias = diasHabilesRestantes(new Date(h.fechaLimite), carga.ahora);

  return (
    <Seccion titulo={`Hoja ${h.codigo}`}>
      <Link href="/admin/reclamos" className="text-sm font-semibold text-[var(--accent)] hover:underline">
        ← Volver a reclamos
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tono="acento">{h.tipo === "reclamo" ? "Reclamo" : "Queja"}</Chip>
        {h.estado === "pendiente" ? (
          <>
            <Chip tono="aviso">Por responder</Chip>
            <Chip tono={dias <= 3 ? "malo" : "aviso"}>{textoPlazo(dias)}</Chip>
          </>
        ) : (
          <Chip tono="ok">Respondido</Chip>
        )}
        {!h.copiaEnviada && <Chip tono="malo">Copia no enviada</Chip>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Registro">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Código">{h.codigo}</Dato>
            <Dato etiqueta="Fecha">{fechaHora(h.createdAt)}</Dato>
            <Dato etiqueta="Fecha límite de respuesta">{fecha(h.fechaLimite)}</Dato>
            <Dato etiqueta="IP">{h.ip || "—"}</Dato>
          </dl>
        </Bloque>

        <Bloque titulo="Proveedor (copia al registrar)">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Nombre comercial">{h.proveedor.nombreComercial}</Dato>
            <Dato etiqueta="Titular">{h.proveedor.titular}</Dato>
            <Dato etiqueta="RUC">{h.proveedor.ruc}</Dato>
            <Dato etiqueta="Correo">{h.proveedor.correo}</Dato>
            <Dato etiqueta="Domicilio">{h.proveedor.domicilio}</Dato>
          </dl>
        </Bloque>

        <Bloque titulo="1. Consumidor">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Nombre">{h.consumidor.nombre}</Dato>
            <Dato etiqueta={DOCUMENTO[h.consumidor.tipoDocumento]}>{h.consumidor.numeroDocumento}</Dato>
            <Dato etiqueta="Domicilio">{h.consumidor.domicilio}</Dato>
            <Dato etiqueta="Celular">
              <a
                href={`https://wa.me/${h.consumidor.telefono}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                {h.consumidor.telefono}
              </a>
            </Dato>
            <Dato etiqueta="Correo">{h.consumidor.email}</Dato>
            {h.representante && (
              <Dato etiqueta="Padre, madre o apoderado">
                {h.representante.nombre} · {DOCUMENTO[h.representante.tipoDocumento]} {h.representante.numeroDocumento}
              </Dato>
            )}
          </dl>
        </Bloque>

        <Bloque titulo="2. Producto o servicio">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Tipo">{h.bien.tipo === "producto" ? "Producto" : "Servicio"}</Dato>
            <Dato etiqueta="Monto reclamado">
              {h.bien.montoReclamado !== undefined ? formatearSoles(h.bien.montoReclamado) : "—"}
            </Dato>
            <Dato etiqueta="Código de pedido (lo escribió el consumidor)">{h.pedidoCodigo || "—"}</Dato>
            <div className="sm:col-span-2">
              <Dato etiqueta="Descripción">{h.bien.descripcion}</Dato>
            </div>
          </dl>
        </Bloque>
      </div>

      <Bloque titulo="3. Detalle">
        <dl className="space-y-3">
          <Dato etiqueta="Detalle">{h.detalle}</Dato>
          <Dato etiqueta="Pedido del consumidor">{h.pedidoConsumidor}</Dato>
        </dl>
      </Bloque>

      <Bloque titulo="Respuesta de la tienda">
        {h.respuesta ? (
          <dl className="space-y-3">
            <Dato etiqueta={`Respondió ${h.respuesta.adminNombre} el ${fechaHora(h.respuesta.fecha)}`}>{h.respuesta.texto}</Dato>
            <p className="text-xs text-[var(--muted)]">
              {h.respuestaEnviada
                ? "Enviada al correo del consumidor."
                : "El correo con la respuesta aún no consta como enviado. Si no llega, escríbele al consumidor desde el correo de la tienda."}
            </p>
          </dl>
        ) : puede("pedidos.gestionar") ? (
          <form onSubmit={responder} className="space-y-3">
            <label htmlFor="respuesta" className="block text-sm">
              Escribe la respuesta para el consumidor
            </label>
            <textarea
              id="respuesta"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={6}
              maxLength={3000}
              disabled={enviando}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
            />
            <p className="text-xs text-[var(--muted)]">
              La respuesta se enviará al correo del consumidor y no se podrá cambiar. {respuesta.trim().length}/3000
            </p>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Enviar respuesta"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-[var(--muted)]">Aún sin respuesta. Tu rol no puede responder reclamos.</p>
        )}
        {aviso && (
          <p role="status" className={`text-sm ${aviso.tono === "ok" ? "text-green-700" : "text-red-600"}`}>
            {aviso.texto}
          </p>
        )}
      </Bloque>
    </Seccion>
  );
}
