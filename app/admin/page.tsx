"use client";

// ─── CAMBIOS RESPECTO AL ORIGINAL ─────────────────────────────────────────
// 1. IMPORTS: eliminado validateImageUrl/validateMultipleImageUrls/IMAGE_LIMITS
//             eliminado "Image" de lucide (conflicto con next/image)
//             añadido: useState callbacks extras, Upload, X, Star, GripVertical, Loader2
// 2. TIPO Product: añadidos imagenes[], imagenPrincipal, tags[]
// 3. FORM PRODUCTOS: eliminados imagenUrl, imagenesAdicionales, metaImagen
//                   añadido tags
// 4. FORM PROMOTIONS: eliminado metaImagen
// 5. ESTADOS nuevos: productImages, uploadPendingImages, isUploading, uploadProgress,
//                    uploadError, bannerImageFile, bannerImagePreview,
//                    promocionImageFile, promocionImagePreview
// 6. handleSubmit productos: ahora sube a Cloudinary antes de guardar
// 7. handleSelect productos: carga imágenes existentes en el uploader
// 8. handleCancel / handleDelete: resetean productImages
// 9. handleBannerSubmit: sube imagen a banners/ en Cloudinary
// 10. handleBannerCancel/Select: resetean bannerImageFile y bannerImagePreview
// 11. handlePromotionSubmit: sube imagen a promociones/ en Cloudinary, metaImagen automática
// 12. handlePromotionCancel/Select: resetean promocionImageFile y promocionImagePreview
// 13. JSX PRODUCTOS: eliminados campos URL Imagen, Imágenes Adicionales, Meta Imagen
//                    añadidos componente ImageUploader, campo Tags
// 14. JSX BANNERS: eliminado input URL Imagen, añadido BannerImageField
// 15. JSX PROMOCIONES: eliminado input URL Imagen Principal, añadido PromocionImageField
//                      eliminado campo Meta Imagen del formulario
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { invalidateCachePattern } from "@/lib/cache";
import {
  Package,
  FolderTree,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Upload,
  X,
  Star,
  GripVertical,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type Product = {
  _id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  categorias?: string[];
  categoriaSlugs?: string[];
  stock?: "Disponible" | "Limitado" | "Agotado";
  // ── Cloudinary (nuevo) ──
  imagenes?: string[];          // array de public_ids
  imagenPrincipal?: string;     // public_id de la portada
  // ── Legacy (se siguen guardando para compatibilidad con el resto del sitio) ──
  imagenUrl?: string;
  imagenesAdicionales?: string[];
  slug?: string;
  deliveryHuancayo?: boolean;
  mostrarEnHome?: boolean;
  descripcionCompleta?: string;
  caracteristicas?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
  whatsappLink?: string;
  videoUrl?: string;
  tags?: string[];              // nuevo
};

type Banner = {
  _id: string;
  titulo: string;
  imagenUrl: string;
  enlace?: string;
  posicion: "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right";
  ubicaciones?: string[];
  activo: boolean;
};

type Category = {
  _id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagenUrl?: string;
  activo: boolean;
  orden: number;
};

type Promotion = {
  _id: string;
  titulo: string;
  descripcion?: string;
  descripcionCompleta?: string;
  precio: number;
  precioAnterior?: number;
  imagenUrl: string;
  imagenesAdicionales?: string[];
  tipoEtiqueta: "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo";
  stock: "Disponible" | "Limitado" | "Agotado";
  activo: boolean;
  orden: number;
  whatsappLink?: string;
  caracteristicas?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
};

// Tipo compartido para el uploader de imágenes
export type UploadedImage = {
  public_id: string;
  secure_url: string;
  isMain?: boolean;
  previewUrl?: string;
  file?: File;
  status: "pending" | "done" | "error";
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER – genera URL Cloudinary con f_auto,q_auto
// ─────────────────────────────────────────────────────────────────────────────

function getCloudinaryUrl(publicIdOrUrl: string, width?: number): string {
  if (!publicIdOrUrl) return "";
  if (publicIdOrUrl.startsWith("http")) return publicIdOrUrl; // URL legacy o ya completa
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const t = width ? `f_auto,q_auto,w_${width}` : "f_auto,q_auto";
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/${publicIdOrUrl}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK INTERNO – sube imágenes pendientes a /api/upload
// ─────────────────────────────────────────────────────────────────────────────

function useImageUpload() {
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE INTERNO – ImageUploader con drag & drop, reorden y selección de portada
// ─────────────────────────────────────────────────────────────────────────────

function ImageUploader({
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE INTERNO – campo de imagen único para Banners
// ─────────────────────────────────────────────────────────────────────────────

function BannerImageField({ currentImageUrl, preview, onFileSelect }: {
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE INTERNO – campo de imagen único para Promociones
// ─────────────────────────────────────────────────────────────────────────────

function PromocionImageField({ currentImageUrl, preview, onFileSelect, tipoEtiqueta }: {
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

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking } = useAuth();

  const [showProductForm, setShowProductForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "banners" | "categories" | "promotions">("products");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // ── Cloudinary: productos ──
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);
  const [uploaderKey, setUploaderKey] = useState("new");
  const { uploadPendingImages, isUploading, uploadProgress, uploadError } = useImageUpload();

  // ── Cloudinary: banners ──
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string>("");

  // ── Cloudinary: promociones ──
  const [promocionImageFile, setPromocionImageFile] = useState<File | null>(null);
  const [promocionImagePreview, setPromocionImagePreview] = useState<string>("");

  // ── PRODUCTOS: form sin imagenUrl / imagenesAdicionales / metaImagen ──
  const [form, setForm] = useState({
    nombre: "", precio: "", descripcion: "", categorias: "", stock: "Disponible",
    deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "",
    metaTitulo: "", metaDescripcion: "", mostrarEnHome: false,
    whatsappLink: "", videoUrl: "", tags: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // ── BANNERS ──
  const [bannerForm, setBannerForm] = useState({
    titulo: "", imagenUrl: "", enlace: "",
    posicion: "top-left" as Banner["posicion"],
    ubicaciones: [""] as string[], activo: true,
  });
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  // ── CATEGORÍAS ──
  const [categoryForm, setCategoryForm] = useState({
    nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryEdit, setSelectedCategoryEdit] = useState<Category | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  // ── PROMOCIONES: form sin metaImagen ──
  const [promotionForm, setPromotionForm] = useState({
    titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "",
    imagenUrl: "", imagenesAdicionales: "",
    tipoEtiqueta: "Oferta" as Promotion["tipoEtiqueta"],
    stock: "Disponible" as Promotion["stock"],
    activo: true, orden: 0, whatsappLink: "", caracteristicas: "",
    metaTitulo: "", metaDescripcion: "",
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isEditingPromotion, setIsEditingPromotion] = useState(false);

  // ─── LOADERS ────────────────────────────────────────────────────────────────

  const loadProducts = async () => {
    try { const res = await fetch("/api/products"); const d = await res.json(); setProducts(Array.isArray(d) ? d : []); }
    catch { setProducts([]); }
  };
  const loadBanners = async () => {
    try { const res = await fetch("/api/banners"); const d = await res.json(); setBanners(Array.isArray(d) ? d : []); }
    catch { setBanners([]); }
  };
  const loadCategories = async () => {
    try { const res = await fetch("/api/categories"); const d = await res.json(); setCategories(Array.isArray(d) ? d : []); }
    catch { setCategories([]); }
  };
  const loadPromotions = async () => {
    try { const res = await fetch("/api/promotions"); const d = await res.json(); setPromotions(Array.isArray(d) ? d : []); }
    catch { setPromotions([]); }
  };
    useEffect(() => {
    const cargarTodo = async () => {
      await Promise.all([
        loadProducts(),
        loadBanners(),
        loadCategories(),
        loadPromotions(),
      ]);
    };
    cargarTodo();
  }, []);
  // ─── STATS ──────────────────────────────────────────────────────────────────

  const stats = [
    { title: "Productos", value: products.length, icon: Package, color: "bg-blue-500", details: `${products.filter(p => p.mostrarEnHome).length} en home`, link: "products" },
    { title: "Categorías", value: categories.filter(c => c.activo).length, icon: FolderTree, color: "bg-purple-500", details: `${categories.length} total`, link: "categories" },
    { title: "Banners", value: banners.filter(b => b.activo).length, icon: Sparkles, color: "bg-orange-500", details: `${banners.length} total`, link: "banners" },
    { title: "Promociones", value: promotions.filter(p => p.activo).length, icon: Sparkles, color: "bg-pink-500", details: `${promotions.length} total`, link: "promotions" },
  ];
  const stockStats = {
    disponible: products.filter(p => p.stock === "Disponible").length,
    limitado: products.filter(p => p.stock === "Limitado").length,
    agotado: products.filter(p => p.stock === "Agotado").length,
  };

  // ─── HANDLERS PRODUCTOS ──────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const resetProductForm = () => {
    setForm({ nombre: "", precio: "", descripcion: "", categorias: "", stock: "Disponible", deliveryHuancayo: true, descripcionCompleta: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "", mostrarEnHome: false, whatsappLink: "", videoUrl: "", tags: "" });
    setProductImages([]); setIsEditing(false); setSelectedProduct(null);
    setUploaderKey("new-" + Date.now());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) { alert("Nombre y precio son obligatorios"); return; }
    if (productImages.length === 0) { alert("Agrega al menos una imagen al producto"); return; }

    try {
      const selectedCategories = form.categorias ? form.categorias.split(",").filter(c => c.trim()) : [];
      const firstCategorySlug = selectedCategories.length > 0
        ? (categories.find(c => c.nombre === selectedCategories[0])?.slug || "general") : "general";
      const tagsList = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

      // 1. Subir imágenes pendientes a Cloudinary
      const imageResult = await uploadPendingImages(productImages, form.nombre, firstCategorySlug, tagsList);
      const selectedSlugs = selectedCategories.map(n => categories.find(c => c.nombre === n)?.slug).filter(Boolean);

      const productData = {
        nombre: form.nombre.trim(), precio: Number(form.precio),
        descripcion: form.descripcion?.trim() || "",
        descripcionCompleta: form.descripcionCompleta?.trim() || "",
        categorias: selectedCategories, categoriaSlugs: selectedSlugs, stock: form.stock,
        // Cloudinary — public_ids
        imagenes: imageResult.imagenes.filter(Boolean),
        imagenPrincipal: imageResult.imagenPrincipal,
        // Legacy — URLs completas para CartSidebar, FavoritosPage, etc.
        imagenUrl: imageResult.imagenUrl,
        imagenesAdicionales: imageResult.imagenesAdicionales,
        videoUrl: form.videoUrl?.trim() || "",
        deliveryHuancayo: form.deliveryHuancayo, mostrarEnHome: form.mostrarEnHome,
        whatsappLink: form.whatsappLink?.trim() || "",
        caracteristicas: form.caracteristicas ? form.caracteristicas.split("\n").filter(c => c.trim()) : [],
        tags: tagsList,
        metaTitulo: form.metaTitulo?.trim() || form.nombre.trim(),
        metaDescripcion: form.metaDescripcion?.trim() || form.descripcion?.trim() || "",
        // metaImagen = portada automática, sin campo manual
        metaImagen: imageResult.imagenUrl,
      };

      let response;
      if (isEditing && selectedProduct) {
        const bodyString = JSON.stringify(productData);
          if (!bodyString) {
            alert("Error: no se pudo serializar el producto");
            return;
          }
          response = await fetch(`/api/products/${selectedProduct._id}`, { 
            method: "PUT", 
            headers: { "Content-Type": "application/json" }, 
            body: bodyString 
          });
      } else {
        response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productData) });
      }
      if (!response.ok) { const err = await response.json(); alert(`Error: ${err.error || "No se pudo guardar"}`); return; }
      invalidateCachePattern("products");
      alert(isEditing ? "Producto actualizado" : "Producto agregado");
      resetProductForm(); await loadProducts();
    } catch (err) { console.error(err); alert("Error al guardar el producto. Revisa la consola."); }
  };

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    setForm({
      nombre: product.nombre, precio: product.precio.toString(),
      descripcion: product.descripcion || "",
      descripcionCompleta: product.descripcionCompleta || "",
      categorias: Array.isArray(product.categorias) ? product.categorias.join(",") : "",
      stock: product.stock || "Disponible",
      deliveryHuancayo: product.deliveryHuancayo ?? true,
      mostrarEnHome: product.mostrarEnHome ?? false,
      whatsappLink: product.whatsappLink || "", videoUrl: product.videoUrl || "",
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      caracteristicas: product.caracteristicas?.join("\n") || "",
      metaTitulo: product.metaTitulo || "", metaDescripcion: product.metaDescripcion || "",
    });
    // Cargar imágenes existentes en el uploader
    if (product.imagenes && product.imagenes.length > 0) {
      // Producto con Cloudinary — usar SOLO imagenes[], ignorar imagenUrl legacy
      setProductImages(product.imagenes.map((pid, index) => ({
        public_id: pid,
        secure_url: getCloudinaryUrl(pid, 300),
        // Si no hay imagenPrincipal definida, la primera es la principal
        isMain: product.imagenPrincipal
          ? pid === product.imagenPrincipal
          : index === 0,
        status: "done" as const,
      })));
    } else if (product.imagenUrl) {
      // Producto legacy sin Cloudinary — mostrar imagenUrl
      setProductImages([{
        public_id: "",
        secure_url: product.imagenUrl,
        previewUrl: product.imagenUrl,
        isMain: true,
        status: "done" as const,
      }]);
    } else {
      setProductImages([]);
    }
    setIsEditing(true); setShowProductForm(true);
    setUploaderKey(product._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); alert(`Error: ${e.error}`); return; }
      invalidateCachePattern("products");
      if (selectedProduct?._id === id) resetProductForm();
      await loadProducts(); alert("Producto eliminado correctamente");
    } catch { alert("Error de conexión al eliminar el producto"); }
  };

  const handleCancel = () => resetProductForm();

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
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.error}`); return; }
      invalidateCachePattern("banners");
      alert(isEditingBanner ? "Banner actualizado" : "Banner agregado");
      setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true });
      setBannerImageFile(null); setBannerImagePreview("");
      setIsEditingBanner(false); setSelectedBanner(null);
      await loadBanners();
    } catch { alert("Error de conexión al guardar el banner"); }
  };

  const handleBannerSelect = (banner: Banner) => {
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

  // ─── HANDLERS CATEGORÍAS (sin cambios respecto al original) ──────────────────

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setCategoryForm({ ...categoryForm, [name]: value });
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryForm.nombre) { alert("El nombre es obligatorio"); return; }
    const data = { nombre: categoryForm.nombre.trim(), descripcion: categoryForm.descripcion?.trim() || "", imagenUrl: categoryForm.imagenUrl?.trim() || "", activo: categoryForm.activo, orden: Number(categoryForm.orden) || 0 };
    try {
      let res;
      if (isEditingCategory && selectedCategoryEdit) {
        res = await fetch(`/api/categories/${selectedCategoryEdit._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      if (!res.ok) { const err = await res.json(); alert(`Error: ${err.error}`); return; }
      invalidateCachePattern("categories");
      alert(isEditingCategory ? "Categoría actualizada" : "Categoría agregada");
      setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 });
      setIsEditingCategory(false); setSelectedCategoryEdit(null);
      await loadCategories();
    } catch { alert("Error de conexión al guardar la categoría"); }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryEdit(category);
    setCategoryForm({ nombre: category.nombre || "", descripcion: category.descripcion || "", imagenUrl: category.imagenUrl || "", activo: category.activo ?? true, orden: category.orden || 0 });
    setIsEditingCategory(true); setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); alert(`Error: ${e.error}`); return; }
      invalidateCachePattern("categories");
      if (selectedCategoryEdit?._id === id) { setSelectedCategoryEdit(null); setIsEditingCategory(false); setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 }); }
      await loadCategories(); alert("Categoría eliminada correctamente");
    } catch { alert("Error de conexión al eliminar la categoría"); }
  };

  const handleCategoryCancel = () => { setIsEditingCategory(false); setSelectedCategoryEdit(null); setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 }); };

  // ─── HANDLERS PROMOCIONES ────────────────────────────────────────────────────

  const handlePromotionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setPromotionForm({ ...promotionForm, [name]: value });
  };

  const resetPromotionForm = () => {
    setPromotionForm({ titulo: "", descripcion: "", descripcionCompleta: "", precio: "", precioAnterior: "", imagenUrl: "", imagenesAdicionales: "", tipoEtiqueta: "Oferta", stock: "Disponible", activo: true, orden: 0, whatsappLink: "", caracteristicas: "", metaTitulo: "", metaDescripcion: "" });
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
      whatsappLink: promotionForm.whatsappLink?.trim() || "",
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
      orden: promotion.orden || 0, whatsappLink: promotion.whatsappLink || "",
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

  // ─── LOGOUT + UTILS ──────────────────────────────────────────────────────────

  const handleLogout = async () => {
    if (confirm("¿Cerrar sesión?")) {
      try { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login-admin"); }
      catch { console.error("Error al cerrar sesión"); }
    }
  };

  const getEtiquetaLabel = (tipo: string) => ({ Combo: "🔴 Combo", "2x1": "🟠 2x1", Descuento: "🟣 Descuento", Oferta: "🔴 Oferta", Nuevo: "🔵 Nuevo" } as Record<string,string>)[tipo] || tipo;
  const getPosicionLabel = (pos: string) => ({ "top-left": "🔴 Arriba Izq", "top-right": "🔴 Arriba Der", "middle-full": "🟢 Medio", "bottom-left": "🔵 Abajo Izq", "bottom-right": "🔵 Abajo Der" } as Record<string,string>)[pos] || pos;

  const validProducts = Array.isArray(products) ? products : [];
  const productsToShow = selectedCategory ? validProducts.filter(p => p.categoriaSlugs?.includes(selectedCategory)) : validProducts;
  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const currentProducts = productsToShow.slice(indexOfLast - ITEMS_PER_PAGE, indexOfLast);
  const totalPages = Math.ceil(productsToShow.length / ITEMS_PER_PAGE);

  // ─── AUTH GUARDS ─────────────────────────────────────────────────────────────

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Panel Administrativo</h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">Gestiona productos, banners y categorías</p>
          </div>
          <Link href="/admin/inventario" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">
            <Package className="w-5 h-5" />
            <span className="hidden sm:inline">Inventario</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>

        <div className="space-y-6 mb-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <button key={i} onClick={() => setActiveTab(stat.link as "products" | "banners" | "categories" | "promotions")} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 text-left">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-xl text-white`}><stat.icon className="w-6 h-6" /></div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.details}</p>
              </button>
            ))}
          </div>

          {/* Stock + Resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5 text-indigo-600" /><h3 className="text-lg font-bold text-gray-800">Estado de Stock</h3></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Disponible</span></div><span className="text-lg font-bold text-green-600">{stockStats.disponible}</span></div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Limitado</span></div><span className="text-lg font-bold text-yellow-600">{stockStats.limitado}</span></div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Agotado</span></div><span className="text-lg font-bold text-red-600">{stockStats.agotado}</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">📊 Resumen Rápido</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/20"><span className="text-sm opacity-90">Total productos</span><span className="text-2xl font-bold">{products.length}</span></div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20"><span className="text-sm opacity-90">Categorías activas</span><span className="text-2xl font-bold">{categories.filter(c => c.activo).length}</span></div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20"><span className="text-sm opacity-90">Banners activos</span><span className="text-2xl font-bold">{banners.filter(b => b.activo).length}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm opacity-90">Promociones activas</span><span className="text-2xl font-bold">{promotions.filter(p => p.activo).length}</span></div>
              </div>
            </div>
          </div>

          {stockStats.limitado > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" /><div><h4 className="font-bold text-yellow-800 mb-1">⚠️ Atención requerida</h4><p className="text-sm text-yellow-700">Tienes <strong>{stockStats.limitado}</strong> producto{stockStats.limitado !== 1 ? "s" : ""} con stock limitado. Considera reabastecer pronto.</p></div></div></div>
          )}
          {stockStats.agotado > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4"><div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" /><div><h4 className="font-bold text-red-800 mb-1">❌ Productos agotados</h4><p className="text-sm text-red-700">Tienes <strong>{stockStats.agotado}</strong> producto{stockStats.agotado !== 1 ? "s" : ""} agotado{stockStats.agotado !== 1 ? "s" : ""}. Los clientes no podrán comprarlos hasta que actualices el stock.</p></div></div></div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl shadow-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { key: "products", label: "📦 Productos", grad: "from-indigo-600 to-indigo-700" },
              { key: "banners", label: "🎨 Banners", grad: "from-orange-500 to-orange-600" },
              { key: "categories", label: "📂 Categorías", grad: "from-purple-600 to-purple-700" },
              { key: "promotions", label: "✨ Promociones", grad: "from-pink-600 to-pink-700" },
            ].map(({ key, label, grad }) => (
              <button key={key} onClick={() => setActiveTab(key as "products" | "banners" | "categories" | "promotions")}
                className={`flex-shrink-0 py-2 md:py-3 px-4 md:px-6 rounded-xl font-semibold transition text-sm md:text-base whitespace-nowrap ${activeTab === key ? `bg-gradient-to-r ${grad} text-white shadow-md` : "text-gray-600 hover:bg-gray-100"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB CATEGORÍAS */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <button onClick={() => { setShowCategoryForm(!showCategoryForm); if (!showCategoryForm) { setIsEditingCategory(false); setSelectedCategoryEdit(null); setCategoryForm({ nombre: "", descripcion: "", imagenUrl: "", activo: true, orden: 0 }); } }}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${showCategoryForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg"}`}>
                {showCategoryForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nueva Categoría"}
              </button>
            </div>
            {showCategoryForm && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">{isEditingCategory ? "✏️ Editar Categoría" : "➕ Agregar Categoría"}</h2>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label><input name="nombre" value={categoryForm.nombre} onChange={handleCategoryChange} placeholder="Ej: Tecnología" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Orden</label><input name="orden" type="number" value={categoryForm.orden} onChange={handleCategoryChange} placeholder="0" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">URL Imagen (opcional)</label><input name="imagenUrl" value={categoryForm.imagenUrl} onChange={handleCategoryChange} placeholder="https://..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label><textarea name="descripcion" value={categoryForm.descripcion} onChange={handleCategoryChange} placeholder="Describe la categoría..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none" /></div>
                  <label className="flex items-center cursor-pointer"><input type="checkbox" name="activo" checked={categoryForm.activo} onChange={handleCategoryChange} className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500" /><span className="ml-3 text-sm font-medium text-gray-700">Categoría activa</span></label>
                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition shadow-md text-sm md:text-base">{isEditingCategory ? "💾 Guardar Cambios" : "➕ Agregar Categoría"}</button>
                    {isEditingCategory && <button type="button" onClick={handleCategoryCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">❌ Cancelar</button>}
                  </div>
                </form>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">📁 Lista ({categories.length})</h2>
              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><p className="text-lg md:text-xl">No hay categorías</p><p className="mt-2 text-sm">¡Crea tu primera categoría! 👆</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map(c => (
                    <div key={c._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-purple-50">
                      {c.imagenUrl && <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32 md:h-40 flex items-center justify-center"><img src={c.imagenUrl} alt={c.nombre} className="max-h-full max-w-full object-contain" /></div>}
                      <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2">{c.nombre}</h3>
                      <p className="text-xs text-gray-500 mb-2">Slug: /{c.slug}</p>
                      {c.descripcion && <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">{c.descripcion}</p>}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Orden: {c.orden}</span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.activo ? "Activa" : "Inactiva"}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleCategorySelect(c)} className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-purple-700 transition text-xs md:text-sm">✏️ Editar</button>
                        <button onClick={() => handleCategoryDelete(c._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB PRODUCTOS */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <button onClick={() => { setShowProductForm(!showProductForm); if (!showProductForm) resetProductForm(); }}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${showProductForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg"}`}>
                {showProductForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nuevo Producto"}
              </button>
            </div>

            {showProductForm && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">{isEditing ? "✏️ Editar Producto" : "➕ Agregar Producto"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nombre + Precio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label><input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Mochila Kpop Negra" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Precio (S/) *</label><input name="precio" type="number" step="0.01" value={form.precio} onChange={handleChange} placeholder="0.00" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>

                    {/* Categorías */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categorías{form.categorias && form.categorias.split(",").filter(c => c).length > 0 && <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">{form.categorias.split(",").filter(c => c).length} seleccionadas</span>}
                      </label>
                      <details className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <summary className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition font-medium text-gray-700 flex items-center justify-between">
                          <span>{form.categorias && form.categorias.split(",").filter(c => c).length > 0 ? form.categorias.split(",").filter(c => c).join(", ") : "Seleccionar categorías..."}</span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="p-4 max-h-64 overflow-y-auto">
                          {categories.filter(c => c.activo).length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No hay categorías disponibles</p>
                          ) : (
                            <div className="space-y-2">
                              {categories.filter(c => c.activo).map(cat => {
                                const isSel = form.categorias?.split(",").filter(c => c).includes(cat.nombre) || false;
                                return (
                                  <label key={cat._id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${isSel ? "bg-indigo-50 border-2 border-indigo-500" : "hover:bg-gray-50 border-2 border-transparent"}`}>
                                    <input type="checkbox" checked={isSel} onChange={(e) => { const cur = form.categorias?.split(",").filter(c => c) || []; const upd = e.target.checked ? [...cur, cat.nombre] : cur.filter(c => c !== cat.nombre); setForm({ ...form, categorias: upd.join(",") }); }} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" />
                                    <div className="flex-1"><span className={`font-medium text-sm ${isSel ? "text-indigo-900" : "text-gray-700"}`}>{cat.nombre}</span>{cat.descripcion && <p className="text-xs text-gray-500 mt-0.5">{cat.descripcion}</p>}</div>
                                    {isSel && <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </details>
                      {form.categorias && form.categorias.split(",").filter(c => c).length > 0 && (
                        <button type="button" onClick={() => setForm({ ...form, categorias: "" })} className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Limpiar selección
                        </button>
                      )}
                    </div>

                    {/* Stock */}
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Stock</label><select name="stock" value={form.stock} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"><option value="Disponible">✅ Disponible</option><option value="Limitado">⚠️ Limitado</option><option value="Agotado">❌ Agotado</option></select></div>
                  </div>

                  {/* ── IMÁGENES CLOUDINARY ── */}
                  <div className="border rounded-xl p-4 md:p-5 space-y-4 bg-gradient-to-br from-indigo-50/30 to-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                      <h3 className="font-bold text-gray-800 text-base">📸 Imágenes del Producto</h3>
                      <span className="text-xs text-gray-500">drag & drop · hasta 10 · máx 5MB · la portada = meta image automática</span>
                    </div>
                    <ImageUploader
                      key={uploaderKey}
                      existingImages={productImages.filter(i => i.status === "done" && i.public_id).map(i => i.public_id)}
                      imagenPrincipalActual={productImages.find(i => i.isMain)?.public_id || ""}
                      onImagesChange={setProductImages}
                      maxImages={10}
                    />
                    {isUploading && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-indigo-700 font-medium"><span>Subiendo a Cloudinary...</span><span>{uploadProgress}%</span></div>
                        <div className="h-2 bg-indigo-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>
                      </div>
                    )}
                    {uploadError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">❌ {uploadError}</div>}
                  </div>

                  {/* Video YouTube */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Video de YouTube (URL)</label>
                    <input name="videoUrl" value={form.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=XXXXX o https://youtu.be/XXXXX" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">🎬 Aparecerá como miniatura con ícono de Play en la galería del producto.</p>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Link de WhatsApp</label>
                    <input name="whatsappLink" value={form.whatsappLink} onChange={handleChange} placeholder="https://wa.me/51978339737?text=Hola..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">Formato: https://wa.me/51978339737?text=Hola...</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags (opcional)</label>
                    <input name="tags" value={form.tags} onChange={handleChange} placeholder="mochila, escolar, kpop, colores" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">Separados por comas — mejoran la búsqueda interna.</p>
                    {form.tags && <div className="flex flex-wrap gap-1 mt-2">{form.tags.split(",").map(t => t.trim()).filter(Boolean).map((tag, i) => <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">{tag}</span>)}</div>}
                  </div>

                  {/* Descripción corta */}
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción (para tarjeta)</label><textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción corta..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>

                  <label className="flex items-center cursor-pointer"><input type="checkbox" name="deliveryHuancayo" checked={form.deliveryHuancayo} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-gray-700">🚚 Delivery gratis Huancayo</span></label>
                  <label className="flex items-center cursor-pointer"><input type="checkbox" name="mostrarEnHome" checked={form.mostrarEnHome} onChange={handleChange} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" /><span className="ml-3 text-sm font-medium text-gray-700">⭐ Mostrar en página de inicio</span></label>

                  {/* Info adicional */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold text-gray-800 mb-3">📄 Información adicional (página del producto)</h3>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Descripción Completa</label><textarea name="descripcionCompleta" value={form.descripcionCompleta} onChange={handleChange} placeholder="Descripción detallada del producto..." rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Características (una por línea)</label><textarea name="caracteristicas" value={form.caracteristicas} onChange={handleChange} placeholder="Pantalla 15.6 pulgadas&#10;Procesador Intel Core i5&#10;8GB RAM" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
                    </div>
                  </div>

                  {/* SEO — SIN campo Meta Imagen (es automática) */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold text-gray-800 mb-1">🔍 SEO y Metadatos</h3>
                    <p className="text-xs text-gray-500 mb-3">La meta image (Open Graph / WhatsApp / Facebook) se asigna automáticamente desde la imagen principal. No necesitas configurarla.</p>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Meta Título</label><input name="metaTitulo" value={form.metaTitulo} onChange={handleChange} placeholder="Título para compartir (se usa el nombre si está vacío)" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-2">Meta Descripción</label><textarea name="metaDescripcion" value={form.metaDescripcion} onChange={handleChange} placeholder="Descripción para redes sociales..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" /></div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button type="submit" disabled={isUploading} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition shadow-md text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed">
                      {isUploading ? "⏳ Subiendo imágenes..." : isEditing ? "💾 Guardar Cambios" : "➕ Agregar Producto"}
                    </button>
                    {isEditing && <button type="button" onClick={handleCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">❌ Cancelar</button>}
                  </div>
                </form>
              </div>
            )}

            {/* Lista de productos */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">📋 Lista ({products.length})</h2>
                <select value={selectedCategory || ""} onChange={(e) => { setSelectedCategory(e.target.value || null); setCurrentPage(1); }} className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition text-sm">
                  <option value="">Todas las categorías</option>
                  {categories.map(c => <option key={c._id} value={c.slug}>{c.nombre}</option>)}
                </select>
              </div>
              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><p className="text-lg md:text-xl">No hay productos</p><p className="mt-2 text-sm">¡Agrega tu primer producto! 👆</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentProducts.map(p => (
                      <div key={p._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-gray-50">
                        {(p.imagenUrl || p.imagenPrincipal) && (
                          <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 h-32 md:h-40 flex items-center justify-center">
                            <img src={p.imagenUrl || getCloudinaryUrl(p.imagenPrincipal || "", 300)} alt={p.nombre} className="max-h-full max-w-full object-contain" />
                          </div>
                        )}
                        <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2 line-clamp-2">{p.nombre}</h3>
                        <p className="text-xl md:text-2xl font-bold text-indigo-600 mb-2">S/ {p.precio.toFixed(2)}</p>
                        {p.slug && <p className="text-xs text-gray-500 mb-2">🔗 /producto/{p.slug}</p>}
                        {p.descripcion && <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">{p.descripcion}</p>}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Array.isArray(p.categorias) && p.categorias.length > 0 && <div className="flex flex-wrap gap-1">{(p.categorias as string[]).map((cat, idx) => <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{cat}</span>)}</div>}
                          {p.stock && <span className={`px-2 py-1 text-xs rounded-full font-medium ${p.stock === "Disponible" ? "bg-green-100 text-green-700" : p.stock === "Limitado" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.stock}</span>}
                          {p.deliveryHuancayo && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">🚚 Delivery</span>}
                          {p.mostrarEnHome && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">⭐ Home</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSelect(p)} className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-indigo-700 transition text-xs md:text-sm">✏️ Editar</button>
                          <button onClick={() => handleDelete(p._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition">← Anterior</button>
                      <span className="text-gray-700 font-medium">Página {currentPage} de {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition">Siguiente →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB BANNERS */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "banners" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">📍 Posiciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white rounded-lg p-3 md:p-4 border border-red-200"><div className="text-xl md:text-2xl mb-2">🔴</div><h4 className="font-bold text-gray-800 text-sm md:text-base">Arriba</h4><p className="text-xs md:text-sm text-gray-600">Enlace opcional</p></div>
                <div className="bg-white rounded-lg p-3 md:p-4 border border-green-200"><div className="text-xl md:text-2xl mb-2">🟢</div><h4 className="font-bold text-gray-800 text-sm md:text-base">Medio</h4><p className="text-xs md:text-sm text-gray-600">Sin enlace</p></div>
                <div className="bg-white rounded-lg p-3 md:p-4 border border-blue-200"><div className="text-xl md:text-2xl mb-2">🔵</div><h4 className="font-bold text-gray-800 text-sm md:text-base">Abajo</h4><p className="text-xs md:text-sm text-gray-600">Enlace obligatorio</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <button onClick={() => { setShowBannerForm(!showBannerForm); if (!showBannerForm) { setIsEditingBanner(false); setSelectedBanner(null); setBannerForm({ titulo: "", imagenUrl: "", enlace: "", posicion: "top-left", ubicaciones: [""], activo: true }); setBannerImageFile(null); setBannerImagePreview(""); } }}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${showBannerForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg"}`}>
                {showBannerForm ? "✖️ Cerrar Formulario" : "➕ Agregar Nuevo Banner"}
              </button>
            </div>
            {showBannerForm && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">{isEditingBanner ? "✏️ Editar Banner" : "➕ Agregar Banner"}</h2>
                <form onSubmit={handleBannerSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Título *</label><input name="titulo" value={bannerForm.titulo} onChange={handleBannerChange} placeholder="Ej: Ofertas de Verano" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Posición</label><select name="posicion" value={bannerForm.posicion} onChange={handleBannerChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"><option value="top-left">🔴 Arriba Izq</option><option value="top-right">🔴 Arriba Der</option><option value="middle-full">🟢 Medio</option><option value="bottom-left">🔵 Abajo Izq</option><option value="bottom-right">🔵 Abajo Der</option></select></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Dónde mostrar este banner * (selecciona uno o varios)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition" style={{ borderColor: bannerForm.ubicaciones?.includes("") ? "#f97316" : "#e5e7eb" }}>
                        <input type="checkbox" checked={bannerForm.ubicaciones?.includes("") || false} onChange={() => handleUbicacionToggle("")} className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500" />
                        <span className="ml-3 text-sm font-medium text-gray-700">🏠 Home (inicio)</span>
                      </label>
                      {categories.filter(c => c.activo).map(cat => (
                        <label key={cat._id} className="flex items-center cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition" style={{ borderColor: bannerForm.ubicaciones?.includes(cat.slug) ? "#f97316" : "#e5e7eb" }}>
                          <input type="checkbox" checked={bannerForm.ubicaciones?.includes(cat.slug) || false} onChange={() => handleUbicacionToggle(cat.slug)} className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500" />
                          <span className="ml-3 text-sm font-medium text-gray-700">📁 {cat.nombre}</span>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enlace {bannerForm.posicion.startsWith("bottom") ? "(Obligatorio)" : bannerForm.posicion === "middle-full" ? "(No disponible)" : "(Opcional)"}</label>
                    <input name="enlace" value={bannerForm.enlace} onChange={handleBannerChange} placeholder={bannerForm.posicion === "middle-full" ? "No disponible" : "https://..."} disabled={bannerForm.posicion === "middle-full"} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100" />
                  </div>
                  <label className="flex items-center cursor-pointer"><input type="checkbox" name="activo" checked={bannerForm.activo} onChange={handleBannerChange} className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500" /><span className="ml-3 text-sm font-medium text-gray-700">Banner activo</span></label>
                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-md text-sm md:text-base">{isEditingBanner ? "💾 Guardar Cambios" : "➕ Agregar Banner"}</button>
                    {isEditingBanner && <button type="button" onClick={handleBannerCancel} className="w-full md:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm md:text-base">❌ Cancelar</button>}
                  </div>
                </form>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">🎨 Lista ({banners.length})</h2>
              {banners.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><p className="text-lg md:text-xl">No hay banners</p><p className="mt-2 text-sm">¡Crea tu primer banner! 👆</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map(b => (
                    <div key={b._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition bg-gradient-to-br from-white to-orange-50">
                      <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2">{b.titulo}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">{getPosicionLabel(b.posicion)}</span>
                        {b.ubicaciones && b.ubicaciones.length > 0
                          ? b.ubicaciones.map((u, idx) => <span key={idx} className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">{u === "" ? "🏠 Home" : `📁 ${categories.find(c => c.slug === u)?.nombre || u}`}</span>)
                          : <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">Sin ubicación</span>}
                      </div>
                      <div className="mb-3 rounded-lg overflow-hidden bg-gray-100"><img src={b.imagenUrl} alt={b.titulo} className="w-full h-32 object-cover" /></div>
                      {b.enlace && <p className="text-xs text-gray-600 mb-2 truncate">🔗 {b.enlace}</p>}
                      <p className="text-sm mb-3">{b.activo ? "✅ Activo" : "❌ Inactivo"}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleBannerSelect(b)} className="flex-1 bg-orange-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-orange-700 transition text-xs md:text-sm">✏️ Editar</button>
                        <button onClick={() => handleBannerDelete(b._id)} className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-600 transition text-xs md:text-sm">🗑️ Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB PROMOCIONES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "promotions" && (
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
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Link de WhatsApp</label><input name="whatsappLink" value={promotionForm.whatsappLink} onChange={handlePromotionChange} placeholder="https://wa.me/51..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" /></div>
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
        )}

      </div>
    </div>
  );
}