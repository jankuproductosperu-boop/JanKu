"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { buildProductUrl } from "@/lib/productUrl";
import type { Popup, PopupDestinoTipo, ProductAdmin, Category, Promotion } from "@/types";
import { Switch } from "@/app/(admin)/admin/_components/ui";

type Props = {
  popup: Popup | null;
  products: ProductAdmin[];
  categories: Category[];
  promotions: Promotion[];
  onSaved: (guardado: Popup) => void;
};

const aInputLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const aIso = (local: string) => (local ? new Date(local).toISOString() : null);

const claseCampo = "w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none";
const claseEtiqueta = "block text-sm font-medium text-[var(--ink)] mb-2";

export default function PopupForm({ popup, products, categories, promotions, onSaved }: Props) {
  const [activo, setActivo] = useState(popup?.activo ?? false);
  const [imagenUrl, setImagenUrl] = useState(popup?.imagenUrl ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [textoBoton, setTextoBoton] = useState(popup?.textoBoton ?? "Ver oferta");
  const [destinoTipo, setDestinoTipo] = useState<PopupDestinoTipo>(popup?.destinoTipo ?? "enlace");
  const [destinoRef, setDestinoRef] = useState(popup?.destinoTipo !== "enlace" ? popup?.destinoRef ?? "" : "");
  const [enlaceLibre, setEnlaceLibre] = useState(popup?.destinoTipo === "enlace" || !popup ? popup?.enlace ?? "" : "");
  const [desde, setDesde] = useState(aInputLocal(popup?.desde ?? null));
  const [hasta, setHasta] = useState(aInputLocal(popup?.hasta ?? null));
  const [guardando, setGuardando] = useState(false);

  const enlace = (() => {
    if (destinoTipo === "enlace") return enlaceLibre.trim();
    if (!destinoRef) return "";
    if (destinoTipo === "categoria") return `/${destinoRef}`;
    if (destinoTipo === "promocion") return `/promocion/${destinoRef}`;
    const p = products.find((x) => x._id === destinoRef);
    return p ? `/producto/${buildProductUrl(p.nombre, p.codigoUrl)}` : "";
  })();

  const elegirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("La imagen no puede superar 5MB"); return; }
    setArchivo(file);
    setVistaPrevia(URL.createObjectURL(file));
    e.target.value = "";
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activo && !archivo && !imagenUrl) { alert("Agrega una imagen para el popup"); return; }
    if (activo && !enlace) { alert("Elige a dónde lleva el botón"); return; }
    setGuardando(true);
    try {
      let url = imagenUrl;
      if (archivo) {
        const fd = new FormData();
        fd.append("entity", "banner");
        fd.append("images", archivo);
        fd.append("bannerNombre", "popup-oferta");
        fd.append("bannerSubcarpeta", "campanas");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) { const err = await res.json(); alert(`Error subiendo imagen: ${err.error}`); return; }
        const data = await res.json();
        const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        url = `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${data.images[0].public_id}`;
      }
      const res = await fetch("/api/admin/popup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagenUrl: url,
          textoBoton: textoBoton.trim(),
          destinoTipo,
          destinoRef: destinoTipo === "enlace" ? "" : destinoRef,
          enlace,
          activo,
          desde: aIso(desde),
          hasta: aIso(hasta),
        }),
      });
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.error || "No se pudo guardar"}`); return; }
      const guardado: Popup = await res.json();
      setImagenUrl(guardado.imagenUrl);
      setArchivo(null);
      setVistaPrevia("");
      onSaved(guardado);
      alert(activo ? "Popup guardado y activo en la tienda" : "Popup guardado (desactivado)");
    } catch { alert("Error de conexión al guardar el popup"); }
    finally { setGuardando(false); }
  };

  const imagenMostrada = vistaPrevia || imagenUrl;

  return (
    <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-[var(--ink)]">Estado</h2>
              <p className="text-sm text-[var(--muted)]">Inactivo: la tienda carga normal, sin ventana.</p>
            </div>
            <Switch activo={activo} onChange={setActivo} etiqueta="Popup activo" />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Imagen de la oferta</h2>
          <p className="text-xs text-[var(--muted)]">Una imagen completa con la oferta (se recomienda cuadrada). Se sube a Cloudinary · máx 5MB.</p>
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--line)] rounded-lg hover:border-indigo-400 transition text-sm text-[var(--muted)]">
            <Upload className="w-4 h-4" />
            <span>{imagenMostrada ? "Cambiar imagen" : "Seleccionar imagen"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={elegirArchivo} />
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Botón</h2>
          <div>
            <label className={claseEtiqueta}>Texto del botón</label>
            <input value={textoBoton} onChange={(e) => setTextoBoton(e.target.value)} maxLength={40} className={claseCampo} placeholder="Ver oferta" />
          </div>
          <div>
            <label className={claseEtiqueta}>¿A dónde lleva?</label>
            <select value={destinoTipo} onChange={(e) => { setDestinoTipo(e.target.value as PopupDestinoTipo); setDestinoRef(""); }} className={claseCampo}>
              <option value="producto">Un producto</option>
              <option value="categoria">Una categoría</option>
              <option value="promocion">Una promoción</option>
              <option value="enlace">Un enlace</option>
            </select>
          </div>
          {destinoTipo === "producto" && (
            <select aria-label="Producto" value={destinoRef} onChange={(e) => setDestinoRef(e.target.value)} className={claseCampo}>
              <option value="">Elige un producto…</option>
              {[...products].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((p) => <option key={p._id} value={p._id}>{p.nombre}</option>)}
            </select>
          )}
          {destinoTipo === "categoria" && (
            <select aria-label="Categoría" value={destinoRef} onChange={(e) => setDestinoRef(e.target.value)} className={claseCampo}>
              <option value="">Elige una categoría…</option>
              {categories.map((c) => <option key={c._id} value={c.slug}>{c.nombre}</option>)}
            </select>
          )}
          {destinoTipo === "promocion" && (
            <select aria-label="Promoción" value={destinoRef} onChange={(e) => setDestinoRef(e.target.value)} className={claseCampo}>
              <option value="">Elige una promoción…</option>
              {promotions.map((p) => <option key={p._id} value={p._id}>{p.titulo}</option>)}
            </select>
          )}
          {destinoTipo === "enlace" && (
            <div>
              <input value={enlaceLibre} onChange={(e) => setEnlaceLibre(e.target.value)} className={claseCampo} placeholder="/promociones  o  https://…" />
              <p className="text-xs text-[var(--muted)] mt-1">Una ruta de la tienda (empieza con /) o un enlace https.</p>
            </div>
          )}
          {enlace && <p className="text-xs text-[var(--muted)]">El botón llevará a: <b className="text-[var(--ink)]">{enlace}</b></p>}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5 space-y-4">
          <h2 className="font-bold text-[var(--ink)]">Programación (opcional)</h2>
          <p className="text-xs text-[var(--muted)]">Si lo dejas vacío, se muestra mientras esté activo.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={claseEtiqueta}>Desde</label><input type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} className={claseCampo} /></div>
            <div><label className={claseEtiqueta}>Hasta</label><input type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} className={claseCampo} /></div>
          </div>
        </div>

        <button type="submit" disabled={guardando} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition shadow-md disabled:opacity-50">
          {guardando ? "⏳ Guardando..." : "💾 Guardar popup"}
        </button>
      </div>

      {/* Vista previa: así se verá en la tienda */}
      <div className="lg:sticky lg:top-20">
        <h2 className="font-bold text-[var(--ink)] mb-2">Vista previa</h2>
        <div className="rounded-2xl bg-black/65 p-6 flex justify-center">
          <div className="w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            {imagenMostrada ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagenMostrada} alt="Vista previa del popup" className="w-full h-auto block" />
            ) : (
              <div className="aspect-square grid place-items-center bg-gray-100 text-sm text-gray-500">Sin imagen</div>
            )}
            <div className="p-3">
              <div className="rounded-xl bg-[#2C2C6C] py-3 text-center font-bold text-white">{textoBoton || "Ver oferta"}</div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
