"use client";
import { useState } from "react";
import { combinaciones, claveCombinacion, etiquetaVariante, MAX_OPCIONES, MAX_VALORES, stockTotal } from "@/lib/variantes";
import type { ProductoOpcion } from "@/types";

/** Variante tal como la edita el formulario (los números van como texto, igual que el resto del formulario). */
export type VarianteForm = {
  _id?: string; // sin _id = nueva, aún no guardada
  combinacion: Record<string, string>;
  stock: string;
  stockAlAbrir?: number; // la cantidad que había al abrir el formulario (para no pisar ajustes ajenos)
  precio: string; // "" = hereda el precio del producto
  imagen: string; // public_id de una de las imágenes del producto, o ""
  sku: string;
  activo: boolean;
};

type Props = {
  opciones: ProductoOpcion[];
  variantes: VarianteForm[];
  imagenes: { public_id: string; url: string }[];
  precioProducto: string;
  onChange: (opciones: ProductoOpcion[], variantes: VarianteForm[]) => void;
};

const campo =
  "w-full px-3 py-2 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm";

/** Editor de ejes (Color, Talla…), combinaciones y tabla de variantes (fase 13b). Sin botón de borrar guardadas: solo desactivar (D-64). */
export default function VariantesEditor({ opciones, variantes, imagenes, precioProducto, onChange }: Props) {
  const [nuevoValor, setNuevoValor] = useState<Record<number, string>>({});
  const guardadas = variantes.some((v) => v._id);
  const orden = opciones.map((o) => o.nombre);

  // Un valor u opción que ya usa una variante guardada no se quita (habría que borrarla).
  const usadoEnGuardada = (nombre: string, valor?: string) =>
    variantes.some((v) => v._id && (valor === undefined ? nombre in v.combinacion : v.combinacion[nombre] === valor));

  const setOpciones = (ops: ProductoOpcion[]) => onChange(ops, variantes);

  const renombrarOpcion = (i: number, nombre: string) => {
    const anterior = opciones[i].nombre;
    const ops = opciones.map((o, j) => (j === i ? { ...o, nombre } : o));
    const vs = variantes.map((v) => {
      if (!(anterior in v.combinacion)) return v;
      const { [anterior]: valor, ...resto } = v.combinacion;
      return { ...v, combinacion: { ...resto, [nombre]: valor } };
    });
    onChange(ops, vs);
  };

  const agregarValor = (i: number) => {
    const valor = (nuevoValor[i] ?? "").trim();
    if (!valor) return;
    const op = opciones[i];
    if (op.valores.some((v) => v.toLowerCase() === valor.toLowerCase()) || op.valores.length >= MAX_VALORES) return;
    setOpciones(opciones.map((o, j) => (j === i ? { ...o, valores: [...o.valores, valor] } : o)));
    setNuevoValor({ ...nuevoValor, [i]: "" });
  };

  const quitarValor = (i: number, valor: string) => {
    const nombre = opciones[i].nombre;
    const ops = opciones.map((o, j) => (j === i ? { ...o, valores: o.valores.filter((v) => v !== valor) } : o));
    // Las nuevas (sin guardar) que usaban ese valor se quitan; las guardadas no llegan aquí.
    onChange(ops, variantes.filter((v) => v._id || v.combinacion[nombre] !== valor));
  };

  const quitarOpcion = (i: number) => {
    const nombre = opciones[i].nombre;
    // Solo se puede quitar si ninguna guardada la usa; las nuevas que la usaban se descartan.
    onChange(
      opciones.filter((_, j) => j !== i),
      variantes.filter((v) => v._id || !(nombre in v.combinacion)),
    );
  };

  const generar = () => {
    const ops = opciones.filter((o) => o.nombre.trim() && o.valores.length > 0);
    const existentes = new Set(variantes.map((v) => claveCombinacion(v.combinacion, ops)));
    const nuevas: VarianteForm[] = combinaciones(ops)
      .filter((c) => !existentes.has(claveCombinacion(c, ops)))
      .map((c) => ({ combinacion: c, stock: "0", precio: "", imagen: "", sku: "", activo: true }));
    onChange(opciones, [...variantes, ...nuevas]);
  };

  const editarVariante = (idx: number, cambio: Partial<VarianteForm>) =>
    onChange(opciones, variantes.map((v, j) => (j === idx ? { ...v, ...cambio } : v)));

  const total = stockTotal(
    variantes.map((v) => ({ stockCantidad: Math.max(0, Math.floor(Number(v.stock || 0))), activo: v.activo })),
  );

  return (
    <div className="space-y-5">
      {/* Opciones */}
      <div className="space-y-3">
        {opciones.map((op, i) => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={op.nombre}
                onChange={(e) => renombrarOpcion(i, e.target.value)}
                placeholder="Nombre de la opción (ej: Color, Talla)"
                className={`${campo} font-semibold`}
                maxLength={40}
              />
              {!usadoEnGuardada(op.nombre) && (
                <button type="button" onClick={() => quitarOpcion(i)} className="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg text-[var(--bad)] hover:bg-[var(--bad-soft)] transition">
                  Quitar
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {op.valores.map((valor) => (
                <span key={valor} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold">
                  {valor}
                  {!usadoEnGuardada(op.nombre, valor) ? (
                    <button type="button" onClick={() => quitarValor(i, valor)} aria-label={`Quitar ${valor}`} className="w-5 h-5 rounded-full hover:bg-[var(--surface)] leading-none">×</button>
                  ) : (
                    <span className="w-2" />
                  )}
                </span>
              ))}
              <input
                value={nuevoValor[i] ?? ""}
                onChange={(e) => setNuevoValor({ ...nuevoValor, [i]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    agregarValor(i);
                  }
                }}
                onBlur={() => agregarValor(i)}
                placeholder="Agregar valor y Enter"
                className="flex-1 min-w-32 px-3 py-1.5 border border-dashed border-[var(--line)] rounded-full text-xs outline-none focus:border-[var(--accent)]"
                maxLength={40}
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {opciones.length < MAX_OPCIONES && (
            <button type="button" onClick={() => setOpciones([...opciones, { nombre: "", valores: [] }])} className="px-3 py-2 text-sm font-semibold rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--bg)] transition">
              + Agregar opción
            </button>
          )}
          <button type="button" onClick={generar} disabled={!opciones.some((o) => o.nombre.trim() && o.valores.length > 0)} className="px-3 py-2 text-sm font-semibold rounded-lg bg-[var(--navy)] text-white hover:opacity-90 transition disabled:opacity-40">
            Generar combinaciones
          </button>
        </div>
      </div>

      {/* Tabla de variantes */}
      {variantes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] text-[var(--muted)] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Variante</th>
                <th className="px-3 py-2 text-left w-24">Stock</th>
                <th className="px-3 py-2 text-left w-28">Precio</th>
                <th className="px-3 py-2 text-left w-36">Imagen</th>
                <th className="px-3 py-2 text-left w-28">SKU</th>
                <th className="px-3 py-2 text-center w-24">Activa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {variantes.map((v, idx) => (
                <tr key={v._id ?? `nueva-${claveCombinacion(v.combinacion, opciones)}`} className={v.activo ? "" : "opacity-55"}>
                  <td className="px-3 py-2 font-medium text-[var(--ink)]">
                    {etiquetaVariante(v.combinacion, orden) || "—"}
                    {!v._id && <span className="ml-2 text-[10px] font-bold uppercase text-[var(--accent)]">nueva</span>}
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="1" value={v.stock} onChange={(e) => editarVariante(idx, { stock: e.target.value })} className={campo} aria-label="Stock" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.01" value={v.precio} onChange={(e) => editarVariante(idx, { precio: e.target.value })} placeholder={precioProducto || "Hereda"} className={campo} aria-label="Precio propio" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={v.imagen} onChange={(e) => editarVariante(idx, { imagen: e.target.value })} className={campo} aria-label="Imagen">
                      <option value="">La del producto</option>
                      {imagenes.map((img, n) => (
                        <option key={img.public_id} value={img.public_id}>Imagen {n + 1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={v.sku} onChange={(e) => editarVariante(idx, { sku: e.target.value })} className={campo} maxLength={50} aria-label="SKU" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {v._id ? (
                      <input type="checkbox" checked={v.activo} onChange={(e) => editarVariante(idx, { activo: e.target.checked })} className="w-5 h-5 accent-[var(--accent)]" aria-label="Activa" />
                    ) : (
                      <button type="button" onClick={() => onChange(opciones, variantes.filter((_, j) => j !== idx))} className="text-xs font-semibold text-[var(--bad)] hover:underline">Quitar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[var(--muted)]">
        Stock total (variantes activas): <b className="text-[var(--ink)]">{total}</b>.
        {guardadas && " Las variantes guardadas no se borran: desactívalas para ocultarlas de la tienda."}
      </p>
    </div>
  );
}
