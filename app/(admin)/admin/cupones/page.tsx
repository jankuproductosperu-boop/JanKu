"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Shuffle, Ticket, X } from "lucide-react";
import type { Coupon } from "@/types";
import Seccion from "@/app/(admin)/admin/_components/Seccion";
import { Chip, Switch, type Tono } from "@/app/(admin)/admin/_components/ui";

// Cupones (fase 19). No se borran: se desactivan (los pedidos los referencian).
// El panel no calcula descuentos: solo muestra y edita la configuración; el servidor valida todo.

type Form = {
  codigo: string;
  descripcion: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: string;
  topeDescuento: string;
  montoMinimo: string;
  fechaInicio: string;
  fechaFin: string;
  usosMaximos: string;
  usosPorCliente: string;
  acumulable: boolean;
  activo: boolean;
};

const VACIO: Form = {
  codigo: "",
  descripcion: "",
  tipo: "porcentaje",
  valor: "",
  topeDescuento: "",
  montoMinimo: "0",
  fechaInicio: "",
  fechaFin: "",
  usosMaximos: "",
  usosPorCliente: "1",
  acumulable: false,
  activo: true,
};

const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODIGO_VALIDO = /^[A-Z0-9-]{4,20}$/;

const claseInput =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60";

function generarCodigo(): string {
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

/** ISO → valor de <input type="datetime-local"> en la hora local del navegador. */
function isoALocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Valor de datetime-local (hora local) → ISO; vacío = sin límite. */
function localAIso(valor: string): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const soles = (n: number) => `S/ ${n.toFixed(2)}`;
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function estadoDe(c: Coupon, ahora: number): { texto: string; tono: Tono } {
  if (!c.activo) return { texto: "Inactivo", tono: "aviso" };
  if (c.fechaFin && new Date(c.fechaFin).getTime() < ahora) return { texto: "Vencido", tono: "malo" };
  if (c.usosMaximos != null && c.usosActuales >= c.usosMaximos) return { texto: "Agotado", tono: "malo" };
  if (c.fechaInicio && new Date(c.fechaInicio).getTime() > ahora) return { texto: "Programado", tono: "acento" };
  return { texto: "Activo", tono: "ok" };
}

function textoDescuento(c: Coupon): string {
  if (c.tipo === "monto_fijo") return soles(c.valor);
  return c.topeDescuento != null ? `${c.valor} % (tope ${soles(c.topeDescuento)})` : `${c.valor} %`;
}

function textoVigencia(c: Coupon): string {
  if (!c.fechaInicio && !c.fechaFin) return "Sin límite";
  if (c.fechaInicio && c.fechaFin) return `${fechaCorta(c.fechaInicio)} – ${fechaCorta(c.fechaFin)}`;
  return c.fechaInicio ? `Desde ${fechaCorta(c.fechaInicio)}` : `Hasta ${fechaCorta(c.fechaFin!)}`;
}

export default function CuponesPage() {
  const [cupones, setCupones] = useState<Coupon[] | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [sinPermiso, setSinPermiso] = useState(false);
  const [recarga, setRecarga] = useState(0);
  // Hora de referencia para el estado calculado; se renueva al recargar la lista.
  const [ahora, setAhora] = useState(0);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Coupon | null>(null);
  const [form, setForm] = useState<Form>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/admin/coupons", { cache: "no-store" });
        const cuerpo: unknown = await res.json().catch(() => null);
        if (!activo) return;
        setAhora(Date.now());
        if (res.status === 403) {
          setSinPermiso(true);
          setCupones([]);
        } else if (!res.ok || !Array.isArray(cuerpo)) {
          setErrorCarga("No se pudieron cargar los cupones");
          setCupones([]);
        } else {
          setErrorCarga("");
          setCupones(cuerpo as Coupon[]);
        }
      } catch {
        if (activo) {
          setErrorCarga("Error de conexión al cargar los cupones");
          setCupones([]);
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
    setForm(VACIO);
    setEditando(null);
    setErrores({});
    setError("");
    setAbierto(true);
  };

  const abrirEditar = (c: Coupon) => {
    setForm({
      codigo: c.codigo,
      descripcion: c.descripcion ?? "",
      tipo: c.tipo,
      valor: String(c.valor),
      topeDescuento: c.topeDescuento != null ? String(c.topeDescuento) : "",
      montoMinimo: String(c.montoMinimo ?? 0),
      fechaInicio: isoALocal(c.fechaInicio),
      fechaFin: isoALocal(c.fechaFin),
      usosMaximos: c.usosMaximos != null ? String(c.usosMaximos) : "",
      usosPorCliente: String(c.usosPorCliente ?? 1),
      acumulable: c.acumulable,
      activo: c.activo,
    });
    setEditando(c);
    setErrores({});
    setError("");
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setEditando(null);
    setForm(VACIO);
  };

  const yaUsado = !!editando && editando.usosActuales > 0;
  const esPorcentaje = form.tipo === "porcentaje";

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    // Comprobaciones básicas para avisar antes de enviar; el servidor vuelve a validarlo todo.
    const locales: Record<string, string> = {};
    if (!editando && !CODIGO_VALIDO.test(form.codigo)) locales.codigo = "4 a 20 caracteres: letras, números o guion";
    const valor = Number(form.valor);
    if (!form.valor || !Number.isFinite(valor) || valor <= 0) locales.valor = "Ingresa un valor mayor a 0";
    else if (esPorcentaje && valor > 100) locales.valor = "El porcentaje no puede superar 100";
    const tope = form.topeDescuento.trim() === "" ? null : Number(form.topeDescuento);
    if (esPorcentaje && tope !== null && !(Number.isFinite(tope) && tope > 0)) locales.topeDescuento = "Ingresa un monto mayor a 0 o déjalo vacío";
    const minimo = form.montoMinimo.trim() === "" ? 0 : Number(form.montoMinimo);
    if (!Number.isFinite(minimo) || minimo < 0) locales.montoMinimo = "Ingresa 0 o más";
    const inicio = localAIso(form.fechaInicio);
    const fin = localAIso(form.fechaFin);
    if (inicio && fin && !(inicio < fin)) locales.fechaFin = "Debe ser posterior al inicio";
    const usosMax = form.usosMaximos.trim() === "" ? null : Number(form.usosMaximos);
    if (usosMax !== null && !(Number.isInteger(usosMax) && usosMax >= 1)) locales.usosMaximos = "Usa un número entero desde 1 o déjalo vacío";
    const porCliente = Number(form.usosPorCliente);
    if (!(Number.isInteger(porCliente) && porCliente >= 1)) locales.usosPorCliente = "Usa un número entero desde 1";
    setErrores(locales);
    setError("");
    if (Object.keys(locales).length) return;

    const comunes = {
      descripcion: form.descripcion.trim(),
      topeDescuento: esPorcentaje ? tope : null,
      montoMinimo: minimo,
      fechaInicio: inicio,
      fechaFin: fin,
      usosMaximos: usosMax,
      usosPorCliente: porCliente,
      acumulable: form.acumulable,
      activo: form.activo,
    };
    // Un cupón ya usado no cambia tipo ni valor: no se envían (el servidor lo rechazaría igual).
    const cuerpo = editando
      ? { ...comunes, ...(yaUsado ? {} : { tipo: form.tipo, valor }) }
      : { codigo: form.codigo, tipo: form.tipo, valor, ...comunes };

    setGuardando(true);
    try {
      const res = await fetch(editando ? `/api/admin/coupons/${editando._id}` : "/api/admin/coupons", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && datos.code === "DUPLICADO") {
          setErrores({ codigo: "Ya existe un cupón con ese código" });
          return;
        }
        if (res.status === 403) {
          setError("No tienes permiso para gestionar cupones");
          return;
        }
        setErrores(datos.fields ?? {});
        setError(datos.error || "No se pudo guardar el cupón");
        return;
      }
      avisar(editando ? "Cupón actualizado" : "Cupón creado");
      cerrar();
      setRecarga((n) => n + 1);
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarActivo = async (c: Coupon, activo: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${c._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (res.ok) {
        const actualizado = (await res.json()) as Coupon;
        setCupones((prev) => (prev ?? []).map((x) => (x._id === c._id ? actualizado : x)));
        avisar(activo ? "Cupón activado" : "Cupón desactivado");
      } else {
        alert("No se pudo cambiar el estado del cupón");
      }
    } catch {
      alert("Error de conexión al cambiar el estado");
    }
  };

  const errorDe = (clave: string) =>
    errores[clave] ? <p className="mt-1 text-xs text-red-600">{errores[clave]}</p> : null;

  const etiqueta = (id: string, texto: string) => (
    <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)] mb-1">
      {texto}
    </label>
  );

  if (sinPermiso) {
    return (
      <Seccion titulo="Cupones">
        <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-[var(--muted)]">
          No tienes permiso para gestionar cupones.
        </p>
      </Seccion>
    );
  }

  return (
    <Seccion titulo="Cupones">
      <p className="-mt-4 text-[var(--muted)]">
        Códigos que el cliente escribe en el checkout. Los cupones no se borran: desactívalos cuando ya no los uses.
      </p>

      {exito && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">{exito}</p>}

      {!abierto && (
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="w-4 h-4" /> Nuevo cupón
        </button>
      )}

      {abierto && (
        <form onSubmit={guardar} noValidate className="max-w-2xl space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--ink)]">{editando ? "Editar cupón" : "Nuevo cupón"}</h2>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="text-[var(--muted)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            {etiqueta("cu-codigo", "Código")}
            <div className="flex gap-2">
              <input
                id="cu-codigo"
                value={form.codigo}
                onChange={(ev) => setForm({ ...form, codigo: ev.target.value.toUpperCase().replace(/\s+/g, "") })}
                readOnly={!!editando}
                maxLength={20}
                placeholder="Ej: BIENVENIDA10"
                autoComplete="off"
                aria-invalid={!!errores.codigo}
                className={`${claseInput} font-mono uppercase ${editando ? "bg-[var(--bg)]" : ""}`}
              />
              {!editando && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, codigo: generarCodigo() })}
                  className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <Shuffle className="w-4 h-4" /> Generar código
                </button>
              )}
            </div>
            {editando && !errores.codigo && <p className="mt-1 text-xs text-[var(--muted)]">El código no se puede cambiar.</p>}
            {errorDe("codigo")}
          </div>

          <div>
            {etiqueta("cu-descripcion", "Descripción interna (opcional)")}
            <input
              id="cu-descripcion"
              value={form.descripcion}
              onChange={(ev) => setForm({ ...form, descripcion: ev.target.value })}
              maxLength={200}
              placeholder="Solo la ves tú. Ej: Campaña de Instagram"
              className={claseInput}
            />
            {errorDe("descripcion")}
          </div>

          <fieldset disabled={yaUsado} className="space-y-4">
            {yaUsado && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Este cupón ya fue usado. Para cambiar el descuento, desactívalo y crea otro.
              </p>
            )}
            <div>
              <span className="block text-sm font-medium text-[var(--ink)] mb-1">Tipo</span>
              <div className="flex flex-wrap gap-4 text-sm">
                {(
                  [
                    ["porcentaje", "Porcentaje"],
                    ["monto_fijo", "Monto fijo (S/)"],
                  ] as const
                ).map(([valor, texto]) => (
                  <label key={valor} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="cu-tipo"
                      checked={form.tipo === valor}
                      onChange={() => setForm({ ...form, tipo: valor })}
                      className="accent-[var(--accent)]"
                    />
                    {texto}
                  </label>
                ))}
              </div>
              {errorDe("tipo")}
            </div>
            <div>
              {etiqueta("cu-valor", esPorcentaje ? "Valor (%)" : "Valor (S/)")}
              <input
                id="cu-valor"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.valor}
                onChange={(ev) => setForm({ ...form, valor: ev.target.value })}
                placeholder={esPorcentaje ? "10" : "15"}
                aria-invalid={!!errores.valor}
                className={claseInput}
              />
              {errorDe("valor")}
            </div>
          </fieldset>

          {esPorcentaje && (
            <div>
              {etiqueta("cu-tope", "Tope de descuento (S/)")}
              <input
                id="cu-tope"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.topeDescuento}
                onChange={(ev) => setForm({ ...form, topeDescuento: ev.target.value })}
                aria-invalid={!!errores.topeDescuento}
                className={claseInput}
              />
              {!errores.topeDescuento && <p className="mt-1 text-xs text-[var(--muted)]">Vacío = sin tope.</p>}
              {errorDe("topeDescuento")}
            </div>
          )}

          <div>
            {etiqueta("cu-minimo", "Compra mínima (S/)")}
            <input
              id="cu-minimo"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.montoMinimo}
              onChange={(ev) => setForm({ ...form, montoMinimo: ev.target.value })}
              aria-invalid={!!errores.montoMinimo}
              className={claseInput}
            />
            {errorDe("montoMinimo")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {etiqueta("cu-inicio", "Válido desde")}
              <input
                id="cu-inicio"
                type="datetime-local"
                value={form.fechaInicio}
                onChange={(ev) => setForm({ ...form, fechaInicio: ev.target.value })}
                aria-invalid={!!errores.fechaInicio}
                className={claseInput}
              />
              {!errores.fechaInicio && <p className="mt-1 text-xs text-[var(--muted)]">Vacío = desde ya.</p>}
              {errorDe("fechaInicio")}
            </div>
            <div>
              {etiqueta("cu-fin", "Válido hasta")}
              <input
                id="cu-fin"
                type="datetime-local"
                value={form.fechaFin}
                onChange={(ev) => setForm({ ...form, fechaFin: ev.target.value })}
                aria-invalid={!!errores.fechaFin}
                className={claseInput}
              />
              {!errores.fechaFin && <p className="mt-1 text-xs text-[var(--muted)]">Vacío = sin fecha de fin.</p>}
              {errorDe("fechaFin")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {etiqueta("cu-usos", "Usos totales")}
              <input
                id="cu-usos"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.usosMaximos}
                onChange={(ev) => setForm({ ...form, usosMaximos: ev.target.value })}
                aria-invalid={!!errores.usosMaximos}
                className={claseInput}
              />
              {!errores.usosMaximos && <p className="mt-1 text-xs text-[var(--muted)]">Vacío = ilimitado.</p>}
              {errorDe("usosMaximos")}
            </div>
            <div>
              {etiqueta("cu-por-cliente", "Usos por cliente")}
              <input
                id="cu-por-cliente"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.usosPorCliente}
                onChange={(ev) => setForm({ ...form, usosPorCliente: ev.target.value })}
                aria-invalid={!!errores.usosPorCliente}
                className={claseInput}
              />
              {errorDe("usosPorCliente")}
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                checked={form.acumulable}
                onChange={(ev) => setForm({ ...form, acumulable: ev.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                Se suma al descuento por monto
                <span className="block text-xs font-normal text-[var(--muted)]">
                  Si no se marca, el cliente recibe el mayor de los dos descuentos, no ambos.
                </span>
              </span>
            </label>
            {errorDe("acumulable")}
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-[var(--ink)]">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(ev) => setForm({ ...form, activo: ev.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Activo
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear cupón"}
            </button>
            <button type="button" onClick={cerrar} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {errorCarga && <p role="alert" className="text-red-600">{errorCarga}</p>}

      {cupones === null ? (
        <p className="text-[var(--muted)]">Cargando…</p>
      ) : cupones.length === 0 ? (
        !errorCarga && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] py-12 text-center text-[var(--muted)]">
            <Ticket className="mx-auto mb-3 h-12 w-12" />
            <p>Aún no tienes cupones.</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--line)] text-left text-[var(--muted)]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descuento</th>
                <th className="p-3">Compra mínima</th>
                <th className="p-3">Vigencia</th>
                <th className="p-3">Usos</th>
                <th className="p-3">Acumulable</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cupones.map((c) => {
                const estado = estadoDe(c, ahora);
                return (
                  <tr key={c._id} className={`border-b border-[var(--line)] last:border-0 ${c.activo ? "" : "opacity-60"}`}>
                    <td className="p-3">
                      <span className="font-mono font-semibold">{c.codigo}</span>
                      {c.descripcion && <span className="block text-xs text-[var(--muted)]">{c.descripcion}</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">{textoDescuento(c)}</td>
                    <td className="p-3 whitespace-nowrap">{c.montoMinimo > 0 ? soles(c.montoMinimo) : "—"}</td>
                    <td className="p-3">{textoVigencia(c)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {c.usosActuales} / {c.usosMaximos ?? "∞"}
                      <span className="block text-xs text-[var(--muted)]">{c.usosPorCliente} por cliente</span>
                    </td>
                    <td className="p-3">{c.acumulable ? "Sí" : "No"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Switch activo={c.activo} onChange={(v) => cambiarActivo(c, v)} etiqueta={`Activar ${c.codigo}`} />
                        <Chip tono={estado.tono}>{estado.texto}</Chip>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => abrirEditar(c)}
                        title="Editar"
                        aria-label={`Editar ${c.codigo}`}
                        className="rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  );
}
