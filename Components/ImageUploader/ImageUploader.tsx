    "use client";
    
    import { useState, useRef, useCallback, useEffect } from "react";
    import Image from "next/image";
    import { X, Upload, Star, GripVertical, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
    import { getCloudinaryUrl } from "@/lib/cloudinary";

    export type UploadedImage = {
    public_id: string;
    secure_url: string;
    width?: number;
    height?: number;
    bytes?: number;
    isMain?: boolean;
    // Para preview local antes de subir
    previewUrl?: string;
    file?: File;
    status: "pending" | "uploading" | "done" | "error";
    error?: string;
    };

    type ImageUploaderProps = {
    /** public_ids ya guardados en MongoDB (al editar un producto) */
    existingImages?: string[];
    imagenPrincipalActual?: string;
    nombreProducto: string;
    categoriaSlug: string;
    onImagesChange: (images: UploadedImage[]) => void;
    maxImages?: number;
    };

    export default function ImageUploader({
    existingImages = [],
    imagenPrincipalActual = "",
    nombreProducto,
    categoriaSlug,
    onImagesChange,
    maxImages = 10,
    }: ImageUploaderProps) {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragItem = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar imágenes existentes al editar
    useEffect(() => {
        if (existingImages.length > 0) {
        const existingUploaded: UploadedImage[] = existingImages.map(
            (publicId, i) => ({
            public_id: publicId,
            secure_url: getCloudinaryUrl(publicId, { width: 400 }),
            isMain: publicId === imagenPrincipalActual,
            status: "done" as const,
            })
        );
        setImages(existingUploaded);
        onImagesChange(existingUploaded);
        }
    }, []);

    const addFiles = useCallback(
        (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const remaining = maxImages - images.length;
        const toAdd = fileArray.slice(0, remaining);

        const newImages: UploadedImage[] = toAdd.map((file, i) => ({
            public_id: "",
            secure_url: "",
            previewUrl: URL.createObjectURL(file),
            file,
            isMain: images.length === 0 && i === 0,
            status: "pending" as const,
        }));

        setImages((prev) => {
            const updated = [...prev, ...newImages];
            onImagesChange(updated);
            return updated;
        });
        },
        [images, maxImages, onImagesChange]
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const removeImage = async (index: number) => {
        const img = images[index];

        // Si ya está subida a Cloudinary, eliminarla del servidor
        if (img.status === "done" && img.public_id) {
        try {
            await fetch("/api/upload/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicId: img.public_id }),
            });
        } catch (err) {
            console.error("Error eliminando imagen:", err);
        }
        }

        // Liberar objectURL si existe
        if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
        }

        setImages((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        // Si era la principal, asignar la primera como principal
        if (img.isMain && updated.length > 0) {
            updated[0].isMain = true;
        }
        onImagesChange(updated);
        return updated;
        });
    };

    const setAsMain = (index: number) => {
        setImages((prev) => {
        const updated = prev.map((img, i) => ({ ...img, isMain: i === index }));
        onImagesChange(updated);
        return updated;
        });
    };

    // Drag-to-reorder
    const handleDragStart = (index: number) => {
        dragItem.current = index;
    };

    const handleDragEnter = (index: number) => {
        setDragOverIndex(index);
    };

    const handleReorderDrop = (e: React.DragEvent, targetIndex: number) => {
        e.stopPropagation();
        if (dragItem.current === null || dragItem.current === targetIndex) {
        setDragOverIndex(null);
        return;
        }

        setImages((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragItem.current!, 1);
        updated.splice(targetIndex, 0, moved);
        dragItem.current = null;
        setDragOverIndex(null);
        onImagesChange(updated);
        return updated;
        });
    };

    const getStatusIcon = (img: UploadedImage) => {
        switch (img.status) {
        case "uploading":
            return (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-20">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            );
        case "error":
            return (
            <div className="absolute inset-0 bg-red-600/70 flex items-center justify-center rounded-xl z-20">
                <AlertCircle className="w-8 h-8 text-white" />
            </div>
            );
        case "done":
            return null;
        default:
            return (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                Pendiente
            </div>
            );
        }
    };

    const imageUrl = (img: UploadedImage) => {
        if (img.previewUrl) return img.previewUrl;
        if (img.public_id) return getCloudinaryUrl(img.public_id, { width: 300 });
        return img.secure_url;
    };

    const canAddMore = images.length < maxImages;
    const pendingCount = images.filter((i) => i.status === "pending").length;

    return (
        <div className="space-y-3">
        {/* Zona de drop */}
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => canAddMore && fileInputRef.current?.click()}
            className={`
            relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer
            ${isDragging
                ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                : canAddMore
                ? "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            }
            `}
        >
            <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={!canAddMore}
            />

            <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-indigo-100" : "bg-gray-100"}`}>
                <Upload className={`w-6 h-6 ${isDragging ? "text-indigo-600" : "text-gray-400"}`} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700">
                {isDragging ? "¡Suelta aquí!" : "Arrastra imágenes o haz clic"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, WEBP · Máx 5MB por imagen · {images.length}/{maxImages} imágenes
                </p>
            </div>
            </div>
        </div>

        {/* Info cuando hay pendientes */}
        {pendingCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
                {pendingCount} imagen{pendingCount > 1 ? "es" : ""} pendiente{pendingCount > 1 ? "s" : ""} de subir.
                Se subirán automáticamente al guardar el producto.
            </span>
            </div>
        )}

        {/* Grid de imágenes */}
        {images.length > 0 && (
            <>
            <p className="text-xs text-gray-500 font-medium">
                Arrastra para reordenar · La imagen con ⭐ es la principal
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {images.map((img, index) => (
                <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDrop={(e) => handleReorderDrop(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => setDragOverIndex(null)}
                    className={`
                    relative group aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150
                    ${img.isMain ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200"}
                    ${dragOverIndex === index ? "scale-105 border-indigo-400 shadow-lg" : ""}
                    `}
                >
                    {/* Imagen */}
                    {imageUrl(img) ? (
                    <img
                        src={imageUrl(img)}
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-full object-cover"
                    />
                    ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                    )}

                    {/* Overlay de estado */}
                    {getStatusIcon(img)}

                    {/* Badge principal */}
                    {img.isMain && (
                    <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                        <Star className="w-2.5 h-2.5" />
                        <span>Principal</span>
                    </div>
                    )}

                    {/* Número */}
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                    {index + 1}
                    </div>

                    {/* Botón eliminar */}
                    <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow"
                    >
                    <X className="w-3 h-3" />
                    </button>

                    {/* Botón set principal */}
                    {!img.isMain && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAsMain(index); }}
                        className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-700 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow"
                        title="Hacer imagen principal"
                    >
                        <Star className="w-3 h-3" />
                    </button>
                    )}

                    {/* Handle drag */}
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-grab">
                    <GripVertical className="w-4 h-4 text-white drop-shadow" />
                    </div>
                </div>
                ))}

                {/* Botón añadir más */}
                {canAddMore && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 flex flex-col items-center justify-center gap-1 transition-all text-gray-400 hover:text-indigo-500"
                >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Agregar</span>
                </button>
                )}
            </div>
            </>
        )}
        </div>
    );
    }