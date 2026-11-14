"use client";
import { Upload } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE INTERNO – campo de imagen único para Promociones
// ─────────────────────────────────────────────────────────────────────────────

export function PromocionImageField({ currentImageUrl, preview, onFileSelect, tipoEtiqueta }: {
  currentImageUrl: string;
  preview: string;
  onFileSelect: (file: File, previewUrl: string) => void;
  tipoEtiqueta: string;
}) {
  const subcarpetaMap: Record<string, string> = { Combo: "combos", "2x1": "combos", Descuento: "ofertas", Oferta: "ofertas", Nuevo: "publicidad" };
  const subcarpeta = subcarpetaMap[tipoEtiqueta] || "ofertas";
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Solo se permiten imágenes"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("La imagen no puede superar 5MB"); return; }
    onFileSelect(file, URL.createObjectURL(file));
    e.target.value = "";
  };
  const display = preview || currentImageUrl;
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Imagen de la Promoción *</label>
      <div className="flex gap-3 items-start">
        {display && <img src={display} alt="preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200 flex-shrink-0" />}
        <div className="flex-1">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-400 hover:bg-pink-50/30 transition text-sm text-gray-600">
            <Upload className="w-4 h-4" />
            <span>{display ? "Cambiar imagen" : "Seleccionar imagen"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
          </label>
          <p className="text-xs text-gray-500 mt-1">Se subirá a <code>promociones/{subcarpeta}/</code> · máx 5MB · la misma imagen se usará como meta image</p>
        </div>
      </div>
    </div>
  );
}
