"use client";
import { useState } from "react";
import { invalidateCachePattern } from "@/lib/cache";
import type { Banner, BannerPosicion, Category } from "@/types";
import { BannerImageField } from "@/app/(admin)/admin/_components/BannerImageField";

export type BannerConPosicion = Banner & { posicion: BannerPosicion };

type Props = { banners: BannerConPosicion[]; categories: Category[]; onReload: () => Promise<void> };

export default function BannersTab({ banners, categories, onReload }: Props) {
  const loadBanners = onReload;

  const [showBannerForm, setShowBannerForm] = useState(false);
  // ── Cloudinary: banners ──
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string>("");

  // ── BANNERS ──
  const [bannerForm, setBannerForm] = useState({
    titulo: "", imagenUrl: "", enlace: "",
    posicion: "top-left" as BannerPosicion,
    ubicaciones: [""] as string[], activo: true,
  });
  const [selectedBanner, setSelectedBanner] = useState<BannerConPosicion | null>(null);
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  // ─── HANDLERS BANNERS ────────────────────────────────────────────────────────

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setBannerForm({ ...bannerForm, [e.target.name]: value });
  };

  const handleUbicacionToggle = (slug: string) => {
    const cur = bannerForm.ubicaciones || [];
    setBannerForm({ ...bannerForm, ubicaciones: cur.includes(slug) ? cur.filter(u => u !== slug) : [...cur, slug] });
  };

  const handleBannerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bannerForm.titulo) { alert("Título es obligatorio"); return; }
    if (!bannerImageFile && !bannerForm.imagenUrl) { alert("Agrega una imagen para el banner"); return; }
    if (!bannerForm.ubicaciones?.length) { alert("Debes seleccionar al menos una ubicación"); return; }
    if ((bannerForm.posicion === "bottom-left" || bannerForm.posicion === "bottom-right") && !bannerForm.enlace) {
      alert("Los banners de abajo requieren un enlace obligatorio"); return;
    }
    if (bannerForm.posicion === "middle-full" && bannerForm.enlace) {
      alert("El banner del medio no debe tener enlace"); return;
    }

    let imagenUrl = bannerForm.imagenUrl;
    if (bannerImageFile) {
      const subcarpeta = bannerForm.ubicaciones?.includes("") ? "home" : "categorias";
      const fd = new FormData();
      fd.append("entity", "banner"); fd.append("images", bannerImageFile);
      fd.append("bannerNombre", bannerForm.titulo); fd.append("bannerSubcarpeta", subcarpeta);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); alert(`Error subiendo imagen: ${err.error}`); return; }
      const data = await res.json();
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      imagenUrl = `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${data.images[0].public_id}`;
    }

    const bannerData = { titulo: bannerForm.titulo.trim(), imagenUrl, enlace: bannerForm.enlace?.trim() || "", posicion: bannerForm.posicion, ubicaciones: bannerForm.ubicaciones, activo: bannerForm.activo };
    try {
      let res;
      if (isEditingBanner && selectedBanner) {
        res = await fetch(`/api/banners/${selectedBanner._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bannerData) });
      } else {
        res = await fetch("/api/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bannerData) });
      }
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.fields?.enlace ?? err.error}`); return; }
      invalidateCachePattern("banners");
      alert(isEditingBanner ? "Banner actualizado" : "Banner agregado");
      setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
      setBannerImageFile(null); setBannerImagePreview("");
      setIsEditingBanner(false); setSelectedBanner(null);
      await loadBanners();
    } catch { alert("Error de conexión al guardar el banner"); }
  };

  const handleBannerSelect = (banner: BannerConPosicion) => {
    setSelectedBanner(banner);
    setBannerForm({ titulo: banner.titulo, imagenUrl: banner.imagenUrl, enlace: banner.enlace || "", posicion: banner.posicion, ubicaciones: banner.ubicaciones || [""], activo: banner.activo });
    setBannerImageFile(null); setBannerImagePreview("");
    setIsEditingBanner(true); setShowBannerForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBannerDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este banner?")) return;
    try {
      const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); alert(`Error: ${e.error}`); return; }
      invalidateCachePattern("banners");
      if (selectedBanner?._id === id) {
        setSelectedBanner(null); setIsEditingBanner(false);
        setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
        setBannerImageFile(null); setBannerImagePreview("");
      }
      await loadBanners(); alert("Banner eliminado correctamente");
    } catch { alert("Error de conexión al eliminar el banner"); }
  };

  const handleBannerCancel = () => {
    setIsEditingBanner(false); setSelectedBanner(null);
    setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
    setBannerImageFile(null); setBannerImagePreview("");
  };

  const getPosicionLabel = (pos: string) => ({ "top-left": "🔴 Arriba Izq", "top-right": "🔴 Arriba Der", "middle-full": "🟢 Medio", "bottom-left": "🔵 Abajo Izq", "bottom-right": "🔵 Abajo Der" } as Record<string,string>)[pos] || pos;

  return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-yellow-50 border-2 border-indigo-200 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-[var(--ink)] mb-4">📍 Posiciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-[var(--surface)] rounded-lg p-3 md:p-4 border border-red-200"><div className="text-xl md:text-2xl mb-2">🔴</div><h4 className="font-bold text-[var(--ink)] text-sm md:text-base">Arriba</h4><p className="text-xs md:text-sm text-[var(--muted)]">Enlace opcional</p></div>
            <div className="bg-[var(--surface)] rounded-lg p-3 md:p-4 border border-green-200"><div className="text-xl md:text-2xl mb-2">🟢</div><h4 className="font-bold text-[var(--ink)] text-sm md:text-base">Medio</h4><p className="text-xs md:text-sm text-[var(--muted)]">Sin enlace</p></div>
            <div className="bg-[var(--surface)] rounded-lg p-3 md:p-4 border border-blue-200"><div className="text-xl md:text-2xl mb-2">🔵</div><h4 className="font-bold text-[var(--ink)] text-sm md:text-base">Abajo</h4><p className="text-xs md:text-sm text-[var(--muted)]">Enlace obligatorio</p></div>
          </div>
        </div>
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6">
          <button onClick={() => { setShowBannerForm(!showBannerForm); if (!showBannerForm) { setIsEditingBanner(false); setSelectedBanner(null); setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true }); setBannerImageFile(null); setBannerImagePreview(""); } }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${showBannerForm ? "bg-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]" : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg"}`}>
            {showBannerForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nuevo Banner"}
          </button>
        </div>
        {showBannerForm && (
          <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--ink)] mb-4 md:mb-6">{isEditingBanner ? "✏️ Editar Banner" : "➕ Agregar Banner"}</h2>
            <form onSubmit={handleBannerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Título *</label><input name="titulo" value={bannerForm.titulo} onChange={handleBannerChange} placeholder="Ej: Ofertas de Verano" className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                <div><label className="block text-sm font-medium text-[var(--ink)] mb-2">Posición</label><select name="posicion" value={bannerForm.posicion} onChange={handleBannerChange} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-[var(--surface)]"><option value="top-left">🔴 Arriba Izq</option><option value="top-right">🔴 Arriba Der</option><option value="middle-full">🟢 Medio</option><option value="bottom-left">🔵 Abajo Izq</option><option value="bottom-right">🔵 Abajo Der</option></select></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-3">Dónde mostrar este banner * (selecciona uno o varios)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-[var(--bg)] transition" style={{ borderColor: bannerForm.ubicaciones?.includes("") ? "#f97316" : "#e5e7eb" }}>
                    <input type="checkbox" checked={bannerForm.ubicaciones?.includes("") || false} onChange={() => handleUbicacionToggle("")} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" />
                    <span className="ml-3 text-sm font-medium text-[var(--ink)]">🏠 Home (inicio)</span>
                  </label>
                  {categories.filter(c => c.activo).map(cat => (
                    <label key={cat._id} className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-[var(--bg)] transition" style={{ borderColor: bannerForm.ubicaciones?.includes(cat.slug) ? "#f97316" : "#e5e7eb" }}>
                      <input type="checkbox" checked={bannerForm.ubicaciones?.includes(cat.slug) || false} onChange={() => handleUbicacionToggle(cat.slug)} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" />
                      <span className="ml-3 text-sm font-medium text-[var(--ink)]">📁 {cat.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
  
              {/* ── IMAGEN BANNER CLOUDINARY ── */}
              <BannerImageField
                currentImageUrl={bannerForm.imagenUrl}
                preview={bannerImagePreview}
                onFileSelect={(file, prev) => { setBannerImageFile(file); setBannerImagePreview(prev); }}
              />
  
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">Enlace {bannerForm.posicion.startsWith("bottom") ? "(Obligatorio)" : bannerForm.posicion === "middle-full" ? "(No disponible)" : "(Opcional)"}</label>
                <input name="enlace" value={bannerForm.enlace} onChange={handleBannerChange} placeholder={bannerForm.posicion === "middle-full" ? "No disponible" : "/ofertas o https://..."} disabled={bannerForm.posicion === "middle-full"} className="w-full px-4 py-3 border border-[var(--line)] rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-[var(--line)]" />
              </div>
              <label className="flex items-center cursor-pointer"><input type="checkbox" name="activo" checked={bannerForm.activo} onChange={handleBannerChange} className="w-5 h-5 text-indigo-600 border-[var(--line)] rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-[var(--ink)]">Banner activo</span></label>
              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transition shadow-md text-sm md:text-base">{isEditingBanner ? "💾 Guardar Cambios" : "➕ Agregar Banner"}</button>
                {isEditingBanner && <button type="button" onClick={handleBannerCancel} className="w-full md:w-auto px-6 py-3 border-2 border-[var(--line)] text-[var(--ink)] rounded-lg font-semibold hover:bg-[var(--bg)] transition text-sm md:text-base">❌ Cancelar</button>}
              </div>
            </form>
          </div>
        )}
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--ink)] mb-6">🎨 Lista ({banners.length})</h2>
          {banners.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)]"><p className="text-lg md:text-xl">No hay banners</p><p className="mt-2 text-sm">¡Crea tu primer banner! 👆</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map(b => (
                <div key={b._id} className="border border-[var(--line)] rounded-xl p-4 hover:shadow-lg transition bg-[var(--surface)]">
                  <h3 className="font-bold text-base md:text-lg text-[var(--ink)] mb-2">{b.titulo}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">{getPosicionLabel(b.posicion)}</span>
                    {b.ubicaciones && b.ubicaciones.length > 0
                      ? b.ubicaciones.map((u, idx) => <span key={idx} className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">{u === "" ? "🏠 Home" : `📁 ${categories.find(c => c.slug === u)?.nombre || u}`}</span>)
                      : <span className="inline-block px-3 py-1 bg-[var(--line)] text-[var(--muted)] text-xs rounded-full font-medium">Sin ubicación</span>}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del panel (D-95) */}
                  <div className="mb-3 rounded-lg overflow-hidden bg-[var(--line)]"><img src={b.imagenUrl} alt={b.titulo} className="w-full h-32 object-cover" /></div>
                  {b.enlace && <p className="text-xs text-[var(--muted)] mb-2 truncate">🔗 {b.enlace}</p>}
                  <p className="text-sm mb-3">{b.activo ? "✅ Activo" : "❌ Inactivo"}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleBannerSelect(b)} className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-indigo-700 transition text-xs md:text-sm">✏️ Editar</button>
                    <button onClick={() => handleBannerDelete(b._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
