"use client";
import { useState } from "react";
import { invalidateCachePattern } from "@/lib/cache";
import type { Promotion } from "@/types";
import { PromocionImageField } from "@/app/(admin)/admin/_components/PromocionImageField";

type Props = { promotions: Promotion[]; onReload: () => Promise<void> };

export default function PromocionesTab({ promotions, onReload }: Props) {
  const loadPromotions = onReload;

  const [showPromotionForm, setShowPromotionForm] = useState(false);
  // ── Cloudinary: promociones ──
  const [promocionImageFile, setPromocionImageFile] = useState<File | null>(null);
  const [promocionImagePreview, setPromocionImagePreview] = useState<string>("");

  // ── PROMOCIONES: form sin metaImagen ──
  const [promotionForm, setPromotionForm] = useState({
    titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
    imagenUrl: "", imagenesAdicionales: "",
    tipoEtiqueta: "Oferta" as Promotion["tipoEtiqueta"],
    stock: "Disponible" as Promotion["stock"],
    activo: true, orden: 0, whatsappNumero: "", caracteristicas: "",
    metaTitulo: "", metaDescripcion: "",
  });
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isEditingPromotion, setIsEditingPromotion] = useState(false);

  // ─── HANDLERS PROMOCIONES ────────────────────────────────────────────────────

  const handlePromotionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setPromotionForm({ ...promotionForm, [name]: value });
  };

  const resetPromotionForm = () => {
    setPromotionForm({ titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "", imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta", stock: "Disponible", activo: true, orden: 0, whatsappNumero: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "" });
    setPromocionImageFile(null); setPromocionImagePreview("");
    setIsEditingPromotion(false); setSelectedPromotion(null);
  };

  const handlePromotionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!promotionForm.titulo || !promotionForm.precio) { alert("Título y precio son obligatorios"); return; }
    if (!promocionImageFile && !promotionForm.imagenUrl) { alert("Agrega una imagen para la promoción"); return; }

    let imagenUrl = promotionForm.imagenUrl;
    if (promocionImageFile) {
      const subcarpetaMap: Record<string, string> = { Combo: "combos", "2x1": "combos", Descuento: "ofertas", Oferta: "ofertas", Nuevo: "publicidad" };
      const fd = new FormData();
      fd.append("entity", "promocion"); fd.append("images", promocionImageFile);
      fd.append("promocionNombre", promotionForm.titulo);
      fd.append("promocionSubcarpeta", subcarpetaMap[promotionForm.tipoEtiqueta] || "ofertas");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); alert(`Error subiendo imagen: ${err.error}`); return; }
      const data = await res.json();
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      imagenUrl = `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${data.images[0].public_id}`;
    }

    const promotionData = {
      titulo: promotionForm.titulo.trim(), descripcion: promotionForm.descripcion?.trim() || "",
      descripcionCompleta: promotionForm.descripcionCompleta?.trim() || "",
      precio: Number(promotionForm.precio),
      precioAnterior: promotionForm.precioAnterior ? Number(promotionForm.precioAnterior) : undefined,
      imagenUrl,
      imagenesAdicionales: promotionForm.imagenesAdicionales ? promotionForm.imagenesAdicionales.split("\n").filter(u => u.trim()) : [],
      tipoEtiqueta: promotionForm.tipoEtiqueta, stock: promotionForm.stock,
      activo: promotionForm.activo, orden: Number(promotionForm.orden) || 0,
      whatsappNumero: promotionForm.whatsappNumero?.trim() || "",
      caracteristicas: promotionForm.caracteristicas ? promotionForm.caracteristicas.split("\n").filter(c => c.trim()) : [],
      metaTitulo: promotionForm.metaTitulo?.trim() || promotionForm.titulo.trim(),
      metaDescripcion: promotionForm.metaDescripcion?.trim() || promotionForm.descripcion?.trim() || "",
      metaImagen: imagenUrl, // automático desde la imagen subida
    };

    try {
      let res;
      if (isEditingPromotion && selectedPromotion) {
        res = await fetch(`/api/promotions/${selectedPromotion._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(promotionData) });
      } else {
        res = await fetch("/api/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(promotionData) });
      }
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.error}`); return; }
      invalidateCachePattern("promotions");
      alert(isEditingPromotion ? "Promoción actualizada" : "Promoción agregada");
      resetPromotionForm(); await loadPromotions();
    } catch { alert("Error de conexión al guardar la promoción"); }
  };

  const handlePromotionSelect = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setPromotionForm({
      titulo: promotion.titulo, descripcion: promotion.descripcion || "",
      descripcionCompleta: promotion.descripcionCompleta || "",
      precio: promotion.precio.toString(), precioAnterior: promotion.precioAnterior?.toString() || "",
      imagenUrl: promotion.imagenUrl || "", imagenesAdicionales: promotion.imagenesAdicionales?.join("\n") || "",
      tipoEtiqueta: promotion.tipoEtiqueta, stock: promotion.stock, activo: promotion.activo,
      orden: promotion.orden || 0, whatsappNumero: promotion.whatsappNumero || "",
      caracteristicas: promotion.caracteristicas?.join("\n") || "",
      metaTitulo: promotion.metaTitulo || "", metaDescripcion: promotion.metaDescripcion || "",
    });
    setPromocionImageFile(null); setPromocionImagePreview("");
    setIsEditingPromotion(true); setShowPromotionForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePromotionDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta promoción?")) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); alert(`Error: ${e.error}`); return; }
      invalidateCachePattern("promotions");
      if (selectedPromotion?._id === id) resetPromotionForm();
      await loadPromotions(); alert("Promoción eliminada correctamente");
    } catch { alert("Error de conexión al eliminar la promoción"); }
  };

  const handlePromotionCancel = () => resetPromotionForm();

  const getEtiquetaLabel = (tipo: string) => ({ Combo: "🔴 Combo", "2x1": "🟠 2x1", Descuento: "🟣 Descuento", Oferta: "🔴 Oferta", Nuevo: "🔵 Nuevo" } as Record<string,string>)[tipo] || tipo;

  return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <button onClick={() => { setShowPromotionForm(!showPromotionForm); if (!showPromotionForm) resetPromotionForm(); }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${showPromotionForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800 shadow-lg"}`}>
            {showPromotionForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nueva Promoción"}
          </button>
        </div>
        {showPromotionForm && (
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">{isEditingPromotion ? "✏️ Editar Promoción" : "➕ Agregar Promoción"}</h2>
            <form onSubmit={handlePromotionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Título *</label><input name="titulo" value={promotionForm.titulo} onChange={handlePromotionChange} placeholder="Ej: Combo de Cocina" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Etiqueta</label><select name="tipoEtiqueta" value={promotionForm.tipoEtiqueta} onChange={handlePromotionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white"><option value="Combo">🔴 Combo</option><option value="2x1">🟠 2x1</option><option value="Descuento">🟣 Descuento</option><option value="Oferta">🔴 Oferta</option><option value="Nuevo">🔵 Nuevo</option></select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Precio Actual (S/) *</label><input name="precio" type="number" step="0.01" value={promotionForm.precio} onChange={handlePromotionChange} placeholder="19.99" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Precio Anterior (S/)</label><input name="precioAnterior" type="number" step="0.01" value={promotionForm.precioAnterior} onChange={handlePromotionChange} placeholder="29.99 (opcional)" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Stock</label><select name="stock" value={promotionForm.stock} onChange={handlePromotionChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white"><option value="Disponible">✅ Disponible</option><option value="Limitado">⚠️ Limitado</option><option value="Agotado">❌ Agotado</option></select></div>
              </div>
  
              {/* ── IMAGEN PROMOCIÓN CLOUDINARY ── */}
              <PromocionImageField
                currentImageUrl={promotionForm.imagenUrl}
                preview={promocionImagePreview}
                onFileSelect={(file, prev) => { setPromocionImageFile(file); setPromocionImagePreview(prev); }}
                tipoEtiqueta={promotionForm.tipoEtiqueta}
              />
  
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción Corta</label><textarea name="descripcion" value={promotionForm.descripcion} onChange={handlePromotionChange} placeholder="Descripción breve para la tarjeta..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción Completa</label><textarea name="descripcionCompleta" value={promotionForm.descripcionCompleta} onChange={handlePromotionChange} placeholder="Descripción detallada para la página individual..." rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Lo que Incluye (una característica por línea)</label><textarea name="caracteristicas" value={promotionForm.caracteristicas} onChange={handlePromotionChange} placeholder="Lámpara parlante&#10;Miniparlante hongo&#10;Set de cubiertos" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Número de WhatsApp</label><input name="whatsappNumero" value={promotionForm.whatsappNumero} onChange={handlePromotionChange} placeholder="51978339737" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" /><p className="text-xs text-gray-500 mt-1">Solo el número — el mensaje se arma solo.</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Orden (para organizar)</label><input name="orden" type="number" value={promotionForm.orden} onChange={handlePromotionChange} placeholder="0" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Meta Título (SEO)</label><input name="metaTitulo" value={promotionForm.metaTitulo} onChange={handlePromotionChange} placeholder="Se usa el título si está vacío" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Meta Descripción (SEO)</label><textarea name="metaDescripcion" value={promotionForm.metaDescripcion} onChange={handlePromotionChange} placeholder="Descripción para redes sociales..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none" /></div>
              <p className="text-xs text-gray-500">✅ La meta image se asigna automáticamente desde la imagen de la promoción.</p>
  
              <label className="flex items-center cursor-pointer"><input type="checkbox" name="activo" checked={promotionForm.activo} onChange={handlePromotionChange} className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-2 focus:ring-pink-500" /><span className="ml-3 text-sm font-medium text-gray-700">Promoción activa</span></label>
              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button type="submit" className="w-full bg-gradient-to-r from-pink-600 to-pink-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-700 hover:to-pink-800 transition shadow-md text-sm md:text-base">{isEditingPromotion ? "💾 Guardar Cambios" : "➕ Agregar Promoción"}</button>
                {isEditingPromotion && <button type="button" onClick={handlePromotionCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">❌ Cancelar</button>}
              </div>
            </form>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">✨ Lista ({promotions.length})</h2>
          {promotions.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p className="text-lg md:text-xl">No hay promociones</p><p className="mt-2 text-sm">¡Crea tu primera promoción! 👆</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(promo => (
                <div key={promo._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-pink-50">
                  {promo.imagenUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32 md:h-40 flex items-center justify-center relative">
                      <img src={promo.imagenUrl} alt={promo.titulo} className="max-h-full max-w-full object-contain" />
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">{promo.tipoEtiqueta}</div>
                    </div>
                  )}
                  <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2 line-clamp-2">{promo.titulo}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    {promo.precioAnterior && <span className="text-gray-400 line-through text-sm">S/ {promo.precioAnterior.toFixed(2)}</span>}
                    <span className="text-pink-600 font-bold text-xl">S/ {promo.precio.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full font-medium">{getEtiquetaLabel(promo.tipoEtiqueta)}</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${promo.stock === "Disponible" ? "bg-green-100 text-green-700" : promo.stock === "Limitado" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{promo.stock}</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${promo.activo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{promo.activo ? "Activa" : "Inactiva"}</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Orden: {promo.orden}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePromotionSelect(promo)} className="flex-1 bg-pink-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-pink-700 transition text-xs md:text-sm">✏️ Editar</button>
                    <button onClick={() => handlePromotionDelete(promo._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
