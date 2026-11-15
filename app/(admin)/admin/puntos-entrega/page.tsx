"use client";
import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Pencil, Plus, X } from "lucide-react";
import type { DeliveryPoint } from "@/types";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { Chip, Switch } from "@/app/(admin)/admin/_components/ui";

// Puntos de entrega (fase 16b, D-72). No se borran: se desactivan, y el checkout solo muestra los activos.

type Form = { nombre: string; direccion: string; referencia: string; horario: string; orden: string; activo: boolean };
const VACIO: Form = { nombre: "", direccion: "", referencia: "", horario: "", orden: "0", activo: true };

const claseInput = "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";

export default function PuntosEntregaPage() {
  const [puntos, setPuntos] = useState<DeliveryPoint[] | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/admin/delivery-points");
        const cuerpo: unknown = await res.json().catch(() => null);
        if (!activo) return;
        if (!res.ok || !Array.isArray(cuerpo)) {
          setErrorCarga("No se pudieron cargar los puntos de entrega");
          setPuntos([]);
        } else {
          setErrorCarga("");
          setPuntos(cuerpo as DeliveryPoint[]);
        }
      } catch {
        if (activo) {
          setErrorCarga("Error de conexión al cargar los puntos de entrega");
          setPuntos([]);
        }
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [recarga]);

  const avisar = (texto: string) => {
    setExito(texto);
    setTimeout(() => setExito(""), 2500);
  };

  const abrirNuevo = () => {
    setForm({ ...VACIO, orden: String(puntos?.length ?? 0) });
    setEditandoId(null);
    setErrores({});
    setError("");
    setAbierto(true);
  };

  const abrirEditar = (p: DeliveryPoint) => {
    setForm({
      nombre: p.nombre,
      direccion: p.direccion,
      referencia: p.referencia ?? "",
      horario: p.horario ?? "",
      orden: String(p.orden),
      activo: p.activo,
    });
    setEditandoId(p._id);
    setErrores({});
    setError("");
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const locales: Record<string, string> = {};
    if (!form.nombre.trim()) locales.nombre = "Ponle un nombre al punto";
    if (!form.direccion.trim()) locales.direccion = "Ingresa la dirección";
    const orden = Number(form.orden);
    if (!Number.isInteger(orden) || orden < 0) locales.orden = "Usa un número entero desde 0";
    setErrores(locales);
    setError("");
    if (Object.keys(locales).length) return;

    setGuardando(true);
    try {
      const cuerpo = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        referencia: form.referencia.trim(),
        horario: form.horario.trim(),
        orden,
        activo: form.activo,
      };
      const res = await fetch(editandoId ? `/api/admin/delivery-points/${editandoId}` : "/api/admin/delivery-points", {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrores(datos.fields ?? {});
        setError(datos.error || "No se pudo guardar el punto");
        return;
      }
      avisar(editandoId ? "Punto actualizado" : "Punto creado");
      cerrar();
      setRecarga((n) => n + 1);
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarActivo = async (p: DeliveryPoint, activo: boolean) => {
    try {
      const res = await fetch(`/api/admin/delivery-points/${p._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (res.ok) {
        const actualizado = (await res.json()) as DeliveryPoint;
        setPuntos((prev) => (prev ?? []).map((x) => (x._id === p._id ? actualizado : x)));
        avisar(activo ? "Punto activado" : "Punto desactivado");
      } else {
        alert("No se pudo cambiar el estado del punto");
      }
    } catch {
      alert("Error de conexión al cambiar el estado");
    }
  };

  const campo = (clave: keyof Form, etiqueta: string, opts: { placeholder?: string; max: number; ayuda?: string }) => (
    <div>
      <label htmlFor={`pe-${clave}`} className="block text-sm font-medium text-[var(--ink)] mb-1">
        {etiqueta}
      </label>
      <input
        id={`pe-${clave}`}
        value={String(form[clave])}
        onChange={(ev) => setForm({ ...form, [clave]: ev.target.value })}
        placeholder={opts.placeholder}
        maxLength={opts.max}
        aria-invalid={!!errores[clave]}
        className={claseInput}
      />
      {opts.ayuda && !errores[clave] && <p className="mt-1 text-xs text-[var(--muted)]">{opts.ayuda}</p>}
      {errores[clave] && <p className="mt-1 text-xs text-red-600">{errores[clave]}</p>}
    </div>
  );

  return (
    <Seccion titulo="Puntos de entrega">
      <p className="-mt-4 text-[var(--muted)]">
        Lugares donde el cliente puede recoger su pedido sin costo adicional. En el checkout solo aparecen los activos. Los
        puntos no se borran: desactívalos cuando ya no los uses.
      </p>

      {exito && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">{exito}</p>}

      {!abierto && (
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="w-4 h-4" /> Nuevo punto
        </button>
      )}

      {abierto && (
        <form onSubmit={guardar} className="max-w-2xl space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--ink)]">{editandoId ? "Editar punto" : "Nuevo punto"}</h2>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="text-[var(--muted)]">
              <X className="w-5 h-5" />
            </button>
          </div>
          {campo("nombre", "Nombre", { placeholder: "Ej: Real Plaza Huancayo", max: 100 })}
          {campo("direccion", "Dirección", { placeholder: "Ej: Av. Ferrocarril 1035", max: 200 })}
          {campo("referencia", "Referencia (opcional)", { placeholder: "Ej: Puerta principal, junto al banco", max: 200 })}
          {campo("horario", "Horario (opcional)", { placeholder: "Ej: Lunes a sábado, 10:00 a 19:00", max: 200 })}
          {campo("orden", "Orden", { max: 6, ayuda: "Los puntos se muestran de menor a mayor." })}
          <label className="flex items-center gap-3 text-sm font-medium text-[var(--ink)]">
            <Switch activo={form.activo} onChange={(v) => setForm({ ...form, activo: v })} etiqueta="Punto activo" />
            Activo (visible en el checkout)
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear punto"}
            </button>
            <button type="button" onClick={cerrar} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {errorCarga && <p role="alert" className="text-red-600">{errorCarga}</p>}

      {puntos === null ? (
        <p className="text-[var(--muted)]">Cargando…</p>
      ) : puntos.length === 0 ? (
        !errorCarga && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] py-12 text-center text-[var(--muted)]">
            <MapPin className="mx-auto mb-3 h-12 w-12" />
            <p>Aún no tienes puntos de entrega.</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--line)] text-left text-[var(--muted)]">
              <tr>
                <th className="p-3">Orden</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Dirección</th>
                <th className="p-3">Horario</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((p) => (
                <tr key={p._id} className={`border-b border-[var(--line)] last:border-0 ${p.activo ? "" : "opacity-60"}`}>
                  <td className="p-3">{p.orden}</td>
                  <td className="p-3 font-semibold">{p.nombre}</td>
                  <td className="p-3">
                    {p.direccion}
                    {p.referencia && <span className="block text-xs text-[var(--muted)]">{p.referencia}</span>}
                  </td>
                  <td className="p-3">{p.horario || "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Switch activo={p.activo} onChange={(v) => cambiarActivo(p, v)} etiqueta={`Activar ${p.nombre}`} />
                      <Chip tono={p.activo ? "ok" : "aviso"}>{p.activo ? "Activo" : "Inactivo"}</Chip>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => abrirEditar(p)}
                      title="Editar"
                      aria-label={`Editar ${p.nombre}`}
                      className="rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  );
}
