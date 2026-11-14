"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, Upload, X, Star, GripVertical, Loader2 } from "lucide-react";
import { getCloudinaryUrl, type UploadedImage } from "@/app/(admin)/admin/_components/imageTypes";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE INTERNO – ImageUploader con drag & drop, reorden y selección de portada
// ─────────────────────────────────────────────────────────────────────────────

export function ImageUploader({
  existingImages = [],
  imagenPrincipalActual = "",
  onImagesChange,
  maxImages = 10,
}: {
  existingImages?: string[];
  imagenPrincipalActual?: string;
  onImagesChange: (imgs: UploadedImage[]) => void;
  maxImages?: number;
}) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingImages.length > 0) {
      const existing: UploadedImage[] = existingImages.map((pid) => ({
        public_id: pid,
        secure_url: getCloudinaryUrl(pid, 300),
        isMain: pid === imagenPrincipalActual,
        status: "done" as const,
      }));
      setImages(existing);
    } else {
      setImages([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingImages.join(","), imagenPrincipalActual]);

    // Notificar al padre DESPUÉS del render, no durante
    useEffect(() => {
      if (images.length > 0) {
        onImagesChange(images);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images]);

  const addFiles = useCallback((files: File[]) => {
    const toAdd = files.slice(0, maxImages - images.length);
    const newImgs: UploadedImage[] = toAdd.map((file, i) => ({
      public_id: "", secure_url: "",
      previewUrl: URL.createObjectURL(file), file,
      isMain: images.length === 0 && i === 0,
      status: "pending" as const,
    }));
    setImages((prev) => {
      const u = [...prev, ...newImgs];
      setTimeout(() => onImagesChange(u), 0);
      return u;
    });
  }, [images, maxImages, onImagesChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { addFiles(Array.from(e.target.files)); e.target.value = ""; }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = async (index: number) => {
    const img = images[index];
    if (img.status === "done" && img.public_id) {
      try {
        await fetch("/api/upload/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: img.public_id }),
        });
      } catch {}
    }
    if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    setImages((prev) => {
      const u = prev.filter((_, i) => i !== index);
      if (img.isMain && u.length > 0) u[0].isMain = true;
      setTimeout(() => onImagesChange(u), 0);
      return u;
    });
  };

  const setAsMain = (index: number) => {
    setImages((prev) => {
      const u = prev.map((img, i) => ({ ...img, isMain: i === index }));
      setTimeout(() => onImagesChange(u), 0);
      return u;
    });
  };

  const handleReorderDrop = (e: React.DragEvent, targetIndex: number) => {
    e.stopPropagation();
    if (dragItem.current === null || dragItem.current === targetIndex) {
      setDragOverIndex(null);
      return;
    }
    setImages((prev) => {
      const u = [...prev];
      const [moved] = u.splice(dragItem.current!, 1);
      u.splice(targetIndex, 0, moved);
      dragItem.current = null;
      setDragOverIndex(null);
      setTimeout(() => onImagesChange(u), 0);
      return u;
    });
  };

  const imgUrl = (img: UploadedImage) => img.previewUrl || (img.public_id ? getCloudinaryUrl(img.public_id, 300) : img.secure_url);
  const canAddMore = images.length < maxImages;
  const pendingCount = images.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => canAddMore && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? "border-indigo-500 bg-indigo-50 scale-[1.01]" : canAddMore ? "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30" : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={!canAddMore} />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDragging ? "bg-indigo-100" : "bg-gray-100"}`}>
            <Upload className={`w-6 h-6 ${isDragging ? "text-indigo-600" : "text-gray-400"}`} />
          </div>
          <p className="text-sm font-semibold text-gray-700">{isDragging ? "¡Suelta aquí!" : "Arrastra imágenes o haz clic para seleccionar"}</p>
          <p className="text-xs text-gray-500">JPG, PNG, WEBP · Máx 5MB · {images.length}/{maxImages} imágenes</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{pendingCount} imagen{pendingCount > 1 ? "es" : ""} pendiente{pendingCount > 1 ? "s" : ""} — se subirán al guardar el producto.</span>
        </div>
      )}

      {images.length > 0 && (
        <>
          <p className="text-xs text-gray-500">Arrastra para reordenar · ★ = portada (también se usa como meta image)</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map((img, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => { dragItem.current = index; }}
                onDragEnter={() => setDragOverIndex(index)}
                onDrop={(e) => handleReorderDrop(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => setDragOverIndex(null)}
                className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${img.isMain ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200"} ${dragOverIndex === index ? "scale-105 border-indigo-400 shadow-lg" : ""}`}
              >
                {imgUrl(img) ? (
                  <img src={imgUrl(img)} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
                )}
                {img.isMain && (
                  <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                    <Star className="w-2.5 h-2.5" /><span>Principal</span>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">{index + 1}</div>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <X className="w-3 h-3" />
                </button>
                {!img.isMain && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setAsMain(index); }}
                    className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-700 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20" title="Hacer portada">
                    <Star className="w-3 h-3" />
                  </button>
                )}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-grab">
                  <GripVertical className="w-4 h-4 text-white drop-shadow" />
                </div>
              </div>
            ))}
            {canAddMore && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 flex flex-col items-center justify-center gap-1 transition-all text-gray-400 hover:text-indigo-500">
                <Upload className="w-5 h-5" /><span className="text-[10px] font-medium">Agregar</span>
              </button>
            )}
          </div>
          {images.some((i) => i.isMain) && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span>✅</span>
              <span>La imagen <strong>Principal</strong> se usará automáticamente como meta image para WhatsApp, Facebook y Open Graph.</span>
            </div>
          )}
          {images.filter((i) => i.status === "done" && i.public_id).length > 0 && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer select-none">Ver public_ids guardados en MongoDB</summary>
              <div className="mt-2 space-y-1 font-mono bg-gray-50 p-2 rounded-lg border">
                {images.filter((i) => i.status === "done" && i.public_id).map((img, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {img.isMain && <span className="text-indigo-600 font-bold">★</span>}
                    <span className="text-gray-600">{img.public_id}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
