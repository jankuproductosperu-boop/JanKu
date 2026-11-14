"use client";
import { useState } from "react";
import type { UploadedImage } from "@/app/(admin)/admin/_components/imageTypes";

// ─────────────────────────────────────────────────────────────────────────────
// HOOK INTERNO – sube imágenes pendientes a /api/upload
// ─────────────────────────────────────────────────────────────────────────────

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadPendingImages = async (
    images: UploadedImage[],
    nombreProducto: string,
    categoriaSlug: string,
    tags: string[] = []
  ) => {
    setUploadError(null);
    const pending = images.filter((i) => i.status === "pending" && i.file);
    let all = [...images];

    if (pending.length > 0) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const fd = new FormData();
        fd.append("entity", "producto");
        fd.append("nombreProducto", nombreProducto);
        fd.append("categoriaSlug", categoriaSlug);
        fd.append("tags", tags.join(","));
        const existingCount = images.filter(i => i.status === "done" && i.public_id && i.public_id.trim() !== "").length;
        fd.append("existingCount", existingCount.toString());
        pending.forEach((i) => i.file && fd.append("images", i.file));
        setUploadProgress(30);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        setUploadProgress(80);
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Error al subir imágenes"); }
        const data = await res.json();
        let idx = 0;
        all = images.map((i) => {
          if (i.status === "pending" && i.file) {
            const u = data.images[idx++];
            return { ...i, public_id: u.public_id, secure_url: u.secure_url, status: "done" as const };
          }
          return i;
        });
        setUploadProgress(100);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al subir imágenes";
        setUploadError(msg);
        throw err;
      } finally { setIsUploading(false); setUploadProgress(0); }
    }

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudinaryImages = all.filter((i) => i.public_id && i.public_id.trim() !== "");
  const legacyImage = all.find((i) => (!i.public_id || i.public_id.trim() === "") && (i.secure_url || i.previewUrl));
  const ids = cloudinaryImages.map((i) => i.public_id);
  const mainCloudinary = cloudinaryImages.find((i) => i.isMain);
  const imagenPrincipal = mainCloudinary?.public_id || ids[0] || "";
  const additionalIds = ids.filter((id) => id !== imagenPrincipal);
  const base = `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto`;
  const imagenUrl = imagenPrincipal
    ? `${base}/${imagenPrincipal}`
    : legacyImage?.secure_url || legacyImage?.previewUrl || "";
  return {
    imagenes: ids,
    imagenPrincipal,
    imagenUrl,
    imagenesAdicionales: additionalIds.map((id) => `${base}/${id}`),
  };
  };
  return { uploadPendingImages, isUploading, uploadProgress, uploadError };
}
