"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Order, Paginated } from "@/types";
import { etiquetaEstado, type OrderEstado } from "@/lib/orderStatus";
import Seccion from "@/app/(admin)/admin/_components/Seccion";

const PAGE_SIZE = 25;

const CLASE_ESTADO: Record<OrderEstado, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-blue-100 text-blue-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-gray-200 text-gray-600",
};
const ETIQUETA_PAGO = { pendiente: "Sin pagar", pagado: "Pagado", reembolsado: "Reembolsado" } as const;

const fechaLima = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" });

type Pestana = OrderEstado | "todos";
const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "confirmado", etiqueta: "Confirmados" },
  { valor: "enviado", etiqueta: "Enviados" },
  { valor: "entregado", etiqueta: "Entregados" },
  { valor: "cancelado", etiqueta: "Cancelados" },
  { valor: "todos", etiqueta: "Todos" },
];

export default function PedidosPage() {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>("pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [caducadosListos, setCaducadosListos] = useState(false);
  const [resultado, setResultado] = useState<{ clave: string; datos: Paginated<Order> | null; error?: string } | null>(null);

  // Al entrar se caducan en silencio los pendientes viejos; si falla (p. ej. sin permiso) se ignora.
  useEffect(() => {
    let activo = true;
    fetch("/api/admin/orders/expire", { method: "POST" })
      .catch(() => undefined)
      .finally(() => {
        if (activo) setCaducadosListos(true);
      });
    return () => {
      activo = false;
    };
  }, []);

  const clave = `${pestana}|${q}|${page}`;
  useEffect(() => {
    if (!caducadosListos) return;
    let activo = true;
    const cargar = async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (pestana !== "todos") params.set("estado", pestana);
      if (q) params.set("q", q);
      try {
        const res = await fetch(`/api/admin/orders?${params}`);
        const cuerpo = await res.json().catch(() => ({}));
        if (!activo) return;
        if (!res.ok) setResultado({ clave, datos: null, error: cuerpo.error || "No se pudieron cargar los pedidos" });
        else setResultado({ clave, datos: cuerpo as Paginated<Order> });
      } catch {
        if (activo) setResultado({ clave, datos: null, error: "Error de conexión al cargar los pedidos" });
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [caducadosListos, clave, pestana, q, page]);

  // Mientras el resultado guardado no corresponda a los filtros actuales, se está cargando.
  const cargando = !caducadosListos || resultado?.clave !== clave;
  const datos = resultado?.clave === clave ? resultado.datos : null;
  const error = resultado?.clave === clave ? resultado.error : undefined;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.pageSize)) : 1;

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(busqueda.trim());
  };

  return (
    <Seccion titulo="Pedidos">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado del pedido">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            role="tab"
            aria-selected={pestana === p.valor}
            onClick={() => {
              setPestana(p.valor);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition ${
              pestana === p.valor
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--bg)]"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <form onSubmit={buscar} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código, teléfono o nombre"
            aria-label="Buscar pedidos"
            maxLength={100}
            className="w-full rounded-lg border border-[var(--line)] pl-9 pr-3 py-2 outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
          Buscar
        </button>
        {q && (
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setQ("");
              setPage(1);
            }}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          >
            Limpiar
          </button>
        )}
      </form>

      {error ? (
        <p role="alert" className="text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-[var(--muted)]">Cargando pedidos…</p>
      ) : !datos || datos.items.length === 0 ? (
        <p className="text-[var(--muted)]">No hay pedidos con estos filtros.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--line)]">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3 text-right">Ítems</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Pago</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((o) => (
                  <tr
                    key={o._id}
                    onClick={() => router.push(`/admin/pedidos/${o._id}`)}
                    className="cursor-pointer border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]"
                  >
                    <td className="p-3 font-mono font-semibold">
                      <Link href={`/admin/pedidos/${o._id}`} className="text-[var(--accent)] hover:underline" onClick={(e) => e.stopPropagation()}>
                        {o.codigo}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fechaLima(o.createdAt)}</td>
                    <td className="p-3">{o.cliente.nombre}</td>
                    <td className="p-3">
                      <a
                        href={`https://wa.me/${o.cliente.telefono}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-600 hover:underline"
                      >
                        {o.cliente.telefono}
                      </a>
                    </td>
                    <td className="p-3 text-right">{o.items.length}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">S/ {o.total.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASE_ESTADO[o.estado]}`}>
                        {etiquetaEstado(o.estado)}
                      </span>
                    </td>
                    <td className="p-3">{ETIQUETA_PAGO[o.pago.estado]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">
              {datos.total} pedido{datos.total === 1 ? "" : "s"} · página {datos.page} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPaginas}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </Seccion>
  );
}
