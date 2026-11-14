"use client";
import { Upload } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE INTERNO – campo de imagen único para Banners
// ─────────────────────────────────────────────────────────────────────────────

export function BannerImageField({ currentImageUrl, preview, onFileSelect }: {
  currentImageUrl: string;
  preview: string;
  onFileSelect: (file: File, previewUrl: string) => void;
}) {
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
      <label className="block text-sm font-medium text-gray-700">Imagen del Banner *</label>
      <div className="flex gap-3 items-start">
        {display && <img src={display} alt="preview" className="w-32 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" />}
        <div className="flex-1">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50/30 transition text-sm text-gray-600">
            <Upload className="w-4 h-4" />
            <span>{display ? "Cambiar imagen" : "Seleccionar imagen"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
          </label>
          <p className="text-xs text-gray-500 mt-1">Se subirá a <code>banners/home/</code> o <code>banners/categorias/</code> · máx 5MB</p>
        </div>
      </div>
    </div>
  );
}
