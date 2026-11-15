"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { MetodoPago, Order, PagoEstado } from "@/types";
import { TRANSICIONES, etiquetaEstado, type OrderEstado } from "@/lib/orderStatus";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { useAdminSession } from "@/app/(admin)/admin/_components/useAdminSession";

const CLASE_ESTADO: Record<OrderEstado, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-blue-100 text-blue-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-gray-200 text-gray-600",
};
const ETIQUETA_ENTREGA = {
  delivery_huancayo: "Delivery en Huancayo",
  punto_entrega: "Punto de entrega",
  recojo: "Recojo en tienda",
  envio_provincia: "Envío a otra ciudad",
} as const;
const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "", etiqueta: "—" },
  { valor: "yape", etiqueta: "Yape" },
  { valor: "plin", etiqueta: "Plin" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "otro", etiqueta: "Otro" },
];

const fechaLima = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
const soles = (n: number) => `S/ ${n.toFixed(2)}`;

type Falla = { texto: string; faltantes?: { nombre: string; motivo: string }[] };

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
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

// Se vuelve a montar (key) cuando cambia el pago guardado, así los campos siempre parten de lo registrado.
function PagoForm({ pago, deshabilitado, onGuardar }: {
  pago: Order["pago"];
  deshabilitado: boolean;
  onGuardar: (p: { estado: PagoEstado; metodo: MetodoPago; referencia: string }) => void;
}) {
  const [estado, setEstado] = useState<PagoEstado>(pago.estado);
  const [metodo, setMetodo] = useState<MetodoPago>(pago.metodo);
  const [referencia, setReferencia] = useState(pago.referencia ?? "");
  const campo = "w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none";

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onGuardar({ estado, metodo, referencia: referencia.trim() });
  };

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">
        Estado del pago
        <select value={estado} onChange={(e) => setEstado(e.target.value as PagoEstado)} disabled={deshabilitado} className={campo}>
          <option value="pendiente">Sin pagar</option>
          <option value="pagado">Pagado</option>
          <option value="reembolsado">Reembolsado</option>
        </select>
      </label>
      <label className="text-sm">
        Método
        <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} disabled={deshabilitado} className={campo}>
          {METODOS.map((m) => (
            <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Nº de operación
        <input value={referencia} maxLength={100} onChange={(e) => setReferencia(e.target.value)} disabled={deshabilitado} className={campo} />
      </label>
      {!deshabilitado && (
        <div className="sm:col-span-3">
          <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            Guardar pago
          </button>
        </div>
      )}
    </form>
  );
}

export default function PedidoAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { puede } = useAdminSession();
  const [pedido, setPedido] = useState<Order | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [falla, setFalla] = useState<Falla | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`);
        const cuerpo = await res.json().catch(() => ({}));
        if (!activo) return;
        if (res.ok) setPedido(cuerpo as Order);
        else setErrorCarga(res.status === 404 ? "No se encontró el pedido." : cuerpo.error || "No se pudo cargar el pedido");
      } catch {
        if (activo) setErrorCarga("Error de conexión al cargar el pedido");
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

  const puedeGestionar = puede("pedidos.gestionar");

  // Una sola vía para todas las acciones; tras cada una el pedido se reemplaza por la respuesta.
  const ejecutar = async (cuerpo: Record<string, unknown>): Promise<boolean> => {
    if (trabajando) return false;
    setTrabajando(true);
    setFalla(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await res.json().catch(() => ({}));
      if (res.ok) {
        setPedido(datos as Order);
        return true;
      }
      if (datos.code === "SIN_STOCK" && datos.fields && pedido) {
        // Las claves son `productoId` o `productoId:varianteId`.
        const faltantes = Object.entries(datos.fields as Record<string, string>).map(([clave, motivo]) => {
          const item = pedido.items.find((i) => (i.varianteId ? `${i.refId}:${i.varianteId}` : i.refId) === clave);
          const nombre = item ? (item.varianteEtiqueta ? `${item.nombre} (${item.varianteEtiqueta})` : item.nombre) : clave;
          return { nombre, motivo };
        });
        setFalla({ texto: "No hay stock suficiente para confirmar. No se cambió nada.", faltantes });
      } else {
        setFalla({ texto: datos.error || "No se pudo completar la acción" });
      }
      return false;
    } catch {
      setFalla({ texto: "Error de conexión. Inténtalo de nuevo." });
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  const confirmar = () => {
    if (!pedido) return;
    const n = pedido.items.filter((i) => i.tipo === "producto").length;
    if (confirm(`Se descontará el stock de ${n} producto${n === 1 ? "" : "s"}. ¿Continuar?`)) void ejecutar({ accion: "confirmar" });
  };
  const enviar = () => {
    const nota = prompt("Número de guía u observación (opcional)");
    if (nota === null) return;
    void ejecutar({ accion: "enviar", ...(nota.trim() ? { nota: nota.trim() } : {}) });
  };
  const cancelar = async (e: FormEvent) => {
    e.preventDefault();
    if (await ejecutar({ accion: "cancelar", motivo: motivo.trim() })) {
      setCancelando(false);
      setMotivo("");
    }
  };
  const anadirNota = async (e: FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) return;
    if (await ejecutar({ accion: "nota", nota: nota.trim() })) setNota("");
  };

  if (errorCarga) {
    return (
      <Seccion titulo="Pedido">
        <Link href="/admin/pedidos" className="-mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">← Volver a pedidos</Link>
        <p role="alert" className="text-red-600">{errorCarga}</p>
      </Seccion>
    );
  }
  if (!pedido) {
    return (
      <Seccion titulo="Pedido">
        <p className="text-[var(--muted)]">Cargando pedido…</p>
      </Seccion>
    );
  }

  const acciones = TRANSICIONES[pedido.estado];
  const hayCostos = pedido.items.some((i) => typeof i.precioCosto === "number");
  const margen = hayCostos
    ? pedido.items
        .filter((i) => i.tipo === "producto")
        .reduce((s, i) => s + (i.precioUnitario - (i.precioCosto ?? 0)) * i.cantidad, 0)
    : 0;
  const e = pedido.entrega;
  const boton = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

  return (
    <Seccion titulo={`Pedido ${pedido.codigo}`}>
      <Link href="/admin/pedidos" className="-mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">← Volver a pedidos</Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${CLASE_ESTADO[pedido.estado]}`}>{etiquetaEstado(pedido.estado)}</span>
        <span className="text-sm text-[var(--muted)]">{fechaLima(pedido.createdAt)}</span>
        <a
          href={`https://wa.me/${pedido.cliente.telefono}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${boton} bg-green-600 text-white hover:bg-green-700`}
        >
          Abrir WhatsApp del cliente
        </a>
      </div>

      {falla && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-2">
          <p>{falla.texto}</p>
          {falla.faltantes && (
            <>
              <ul className="list-disc pl-5">
                {falla.faltantes.map((f, i) => (
                  <li key={i}><strong>{f.nombre}</strong>: {f.motivo}</li>
                ))}
              </ul>
              <Link href="/admin/inventario" className="inline-block font-semibold underline">Ir a Inventario</Link>
            </>
          )}
        </div>
      )}

      {puedeGestionar && acciones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {acciones.includes("confirmado") && (
            <button onClick={confirmar} disabled={trabajando} className={`${boton} bg-[var(--accent)] text-white`}>Confirmar pedido</button>
          )}
          {acciones.includes("enviado") && (
            <button onClick={enviar} disabled={trabajando} className={`${boton} bg-indigo-600 text-white`}>Marcar enviado</button>
          )}
          {acciones.includes("entregado") && (
            <button onClick={() => void ejecutar({ accion: "entregar" })} disabled={trabajando} className={`${boton} bg-green-600 text-white`}>Marcar entregado</button>
          )}
          {acciones.includes("cancelado") && !cancelando && (
            <button onClick={() => setCancelando(true)} disabled={trabajando} className={`${boton} border border-red-300 text-red-700`}>Cancelar pedido</button>
          )}
        </div>
      )}

      {puedeGestionar && cancelando && (
        <form onSubmit={cancelar} className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-800">
            {pedido.stockDescontado ? "Se devolverá el stock al inventario. " : ""}Indica el motivo de la cancelación (3 a 200 letras).
          </p>
          <input
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            minLength={3}
            maxLength={200}
            required
            aria-label="Motivo de la cancelación"
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={trabajando || motivo.trim().length < 3} className={`${boton} bg-red-600 text-white`}>Cancelar pedido</button>
            <button type="button" onClick={() => setCancelando(false)} className={`${boton} border border-[var(--line)]`}>Volver</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Ítems">
          <ul className="divide-y divide-[var(--line)] text-sm">
            {pedido.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3 py-2">
                <span>
                  {i.nombre}
                  {i.varianteEtiqueta ? ` (${i.varianteEtiqueta})` : ""} × {i.cantidad}
                  {i.tipo === "promocion" && <em className="ml-1 text-xs text-[var(--muted)]">promoción</em>}
                </span>
                <span className="font-semibold whitespace-nowrap">{soles(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="text-sm space-y-1 border-t border-[var(--line)] pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{soles(pedido.subtotal)}</dd></div>
            {pedido.descuentoNivel && (
              <div className="flex justify-between text-green-600"><dt>Descuento ({pedido.descuentoNivel.nombre})</dt><dd>- {soles(pedido.descuentoNivel.monto)}</dd></div>
            )}
            {pedido.cupon && (
              <div className="flex justify-between text-green-600"><dt>Cupón ({pedido.cupon.codigo})</dt><dd>- {soles(pedido.cupon.monto)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd>{pedido.envioPorCoordinar ? "Por coordinar" : pedido.costoEnvio > 0 ? soles(pedido.costoEnvio) : "Gratis"}</dd>
            </div>
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{soles(pedido.total)}</dd></div>
            {hayCostos && (
              <div className="flex justify-between text-[var(--muted)]">
                <dt>Margen estimado (productos, antes de descuentos)</dt><dd>{soles(margen)}</dd>
              </div>
            )}
          </dl>
        </Bloque>

        <Bloque titulo="Cliente y entrega">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Nombre">{pedido.cliente.nombre}</Dato>
            <Dato etiqueta="Celular">{pedido.cliente.telefono}</Dato>
            {pedido.cliente.email && <Dato etiqueta="Correo"><span className="break-all">{pedido.cliente.email}</span></Dato>}
            <Dato etiqueta="Entrega">{ETIQUETA_ENTREGA[e.metodo]}</Dato>
            {e.direccion && <Dato etiqueta="Dirección">{e.direccion}{e.referencia ? ` (${e.referencia})` : ""}</Dato>}
            {(e.ciudad || e.departamento) && <Dato etiqueta="Ciudad">{[e.ciudad, e.departamento].filter(Boolean).join(", ")}</Dato>}
            {pedido.notasCliente && <Dato etiqueta="Nota del cliente">{pedido.notasCliente}</Dato>}
          </dl>
        </Bloque>

        <Bloque titulo="Pago">
          <PagoForm
            key={`${pedido.pago.estado}|${pedido.pago.metodo}|${pedido.pago.referencia ?? ""}`}
            pago={pedido.pago}
            deshabilitado={!puedeGestionar || trabajando}
            onGuardar={(p) => void ejecutar({ accion: "pago", ...p })}
          />
          {pedido.pago.fecha && <p className="text-xs text-[var(--muted)]">Pagado el {fechaLima(pedido.pago.fecha)}</p>}
        </Bloque>

        <Bloque titulo="Notas internas">
          {pedido.notasInternas ? (
            <p className="whitespace-pre-line text-sm">{pedido.notasInternas}</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">Sin notas.</p>
          )}
          {puedeGestionar && (
            <form onSubmit={anadirNota} className="space-y-2">
              <textarea
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                maxLength={500}
                rows={2}
                aria-label="Nueva nota interna"
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              />
              <button type="submit" disabled={trabajando || !nota.trim()} className={`${boton} border border-[var(--line)]`}>Añadir nota</button>
            </form>
          )}
        </Bloque>

        <Bloque titulo="Historial">
          <ol className="space-y-2 text-sm">
            {pedido.historial.map((h, k) => (
              <li key={k}>
                <b>{etiquetaEstado(h.estado)}</b> · {fechaLima(h.fecha)}
                {h.adminNombre ? ` · ${h.adminNombre}` : h.estado !== "pendiente" ? " · sistema" : ""}
                {h.nota && <span className="block text-[var(--muted)]">{h.nota}</span>}
              </li>
            ))}
          </ol>
        </Bloque>

        {pedido.origen && (
          <Bloque titulo="Origen">
            <p className="text-sm">IP: {pedido.origen.ip ?? "—"}</p>
          </Bloque>
        )}
      </div>
    </Seccion>
  );
}
