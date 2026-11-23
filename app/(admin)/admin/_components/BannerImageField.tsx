"use client";
import { Upload } from "lucide-react";
import { leerComoDataUrl } from "@/app/(admin)/admin/_components/vistaPrevia";

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
    leerComoDataUrl(file)
      .then((url) => onFileSelect(file, url))
      .catch(() => onFileSelect(file, ""));
    e.target.value = "";
  };
  const display = preview || currentImageUrl;
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--ink)]">Imagen del Banner *</label>
      <div className="flex gap-3 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa data: o URL ya transformada (D-95) */}
        {display && <img src={display} alt="preview" className="w-32 h-16 object-cover rounded-lg border border-[var(--line)] flex-shrink-0" />}
        <div className="flex-1">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--line)] rounded-lg hover:border-indigo-400 hover:bg-indigo-50/30 transition text-sm text-[var(--muted)]">
            <Upload className="w-4 h-4" />
            <span>{display ? "Cambiar imagen" : "Seleccionar imagen"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
          </label>
          <p className="text-xs text-[var(--muted)] mt-1">Se subirá a <code>banners/home/</code> o <code>banners/categorias/</code> · máx 5MB</p>
        </div>
      </div>
    </div>
  );
}
