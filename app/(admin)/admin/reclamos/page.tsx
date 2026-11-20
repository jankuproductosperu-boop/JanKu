"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Complaint, ComplaintEstado, Paginated } from "@/types";
import { diasHabilesRestantes } from "@/lib/diasHabiles";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { Chip } from "@/app/(admin)/admin/_components/ui";

const PAGE_SIZE = 25;

const fechaLima = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" });

type Pestana = ComplaintEstado | "todos";
const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: "pendiente", etiqueta: "Por responder" },
  { valor: "respondido", etiqueta: "Respondidos" },
  { valor: "todos", etiqueta: "Todos" },
];

/** Plazo de una hoja pendiente: rojo si quedan 3 días hábiles o menos, o si venció (D-81). */
function PlazoReclamo({ fechaLimite, ahora }: { fechaLimite: string; ahora: Date }) {
  const dias = diasHabilesRestantes(new Date(fechaLimite), ahora);
  const texto =
    dias < 0
      ? `Vencido hace ${-dias} día${dias === -1 ? "" : "s"} hábil${dias === -1 ? "" : "es"}`
      : dias === 0
        ? "Vence hoy"
        : `${dias} día${dias === 1 ? "" : "s"} hábil${dias === 1 ? "" : "es"}`;
  return <Chip tono={dias <= 3 ? "malo" : "aviso"}>{texto}</Chip>;
}

export default function ReclamosPage() {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>("pendiente");
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<{
    clave: string;
    datos: Paginated<Complaint> | null;
    ahora: Date;
    error?: string;
  } | null>(null);

  const clave = `${pestana}|${page}`;
  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (pestana !== "todos") params.set("estado", pestana);
      try {
        const res = await fetch(`/api/admin/complaints?${params}`);
        const cuerpo = await res.json().catch(() => ({}));
        if (!activo) return;
        // La hora de referencia del plazo se toma al cargar, no en cada render.
        if (!res.ok) setResultado({ clave, datos: null, ahora: new Date(), error: cuerpo.error || "No se pudieron cargar los reclamos" });
        else setResultado({ clave, datos: cuerpo as Paginated<Complaint>, ahora: new Date() });
      } catch {
        if (activo) setResultado({ clave, datos: null, ahora: new Date(), error: "Error de conexión al cargar los reclamos" });
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [clave, pestana, page]);

  const cargando = resultado?.clave !== clave;
  const datos = resultado?.clave === clave ? resultado.datos : null;
  const error = resultado?.clave === clave ? resultado.error : undefined;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.pageSize)) : 1;

  return (
    <Seccion titulo="Libro de Reclamaciones">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado del reclamo">
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

      {error ? (
        <p role="alert" className="text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-[var(--muted)]">Cargando reclamos…</p>
      ) : !datos || datos.items.length === 0 ? (
        <p className="text-[var(--muted)]">No hay reclamos en esta lista.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--line)]">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Consumidor</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Plazo</th>
                  <th className="p-3">Copia</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => router.push(`/admin/reclamos/${r._id}`)}
                    className="cursor-pointer border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]"
                  >
                    <td className="p-3 font-mono font-semibold whitespace-nowrap">
                      <Link
                        href={`/admin/reclamos/${r._id}`}
                        className="text-[var(--accent)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.codigo}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fechaLima(r.createdAt)}</td>
                    <td className="p-3">{r.tipo === "reclamo" ? "Reclamo" : "Queja"}</td>
                    <td className="p-3">{r.consumidor.nombre}</td>
                    <td className="p-3">
                      {r.estado === "pendiente" ? <Chip tono="aviso">Por responder</Chip> : <Chip tono="ok">Respondido</Chip>}
                    </td>
                    <td className="p-3">
                      {r.estado === "pendiente" ? (
                        <PlazoReclamo fechaLimite={r.fechaLimite} ahora={resultado!.ahora} />
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {r.copiaEnviada ? (
                        <span className="text-[var(--muted)]">Enviada</span>
                      ) : (
                        <Chip tono="malo">Copia no enviada</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">
              {datos.total} hoja{datos.total === 1 ? "" : "s"} · página {datos.page} de {totalPaginas}
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
