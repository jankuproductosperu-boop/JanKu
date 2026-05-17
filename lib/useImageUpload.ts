    "use client";

    import { useState } from "react";
    import type { UploadedImage } from "@/Components/ImageUploader/ImageUploader";

    type UploadResult = {
    imagenes: string[];          
    imagenPrincipal: string;     
    imagenUrl: string;         
    imagenesAdicionales: string[]; 
    };

    type UseImageUploadReturn = {
    uploadPendingImages: (
        images: UploadedImage[],
        nombreProducto: string,
        categoriaSlug: string,
        tags?: string[]
    ) => Promise<UploadResult>;
    isUploading: boolean;
    uploadProgress: number;
    uploadError: string | null;
    };

    export function useImageUpload(): UseImageUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const uploadPendingImages = async (
        images: UploadedImage[],
        nombreProducto: string,
        categoriaSlug: string,
        tags: string[] = []
    ): Promise<UploadResult> => {
        setUploadError(null);

        // Separar imágenes ya subidas de las pendientes
        const doneImages = images.filter((img) => img.status === "done" && img.public_id);
        const pendingImages = images.filter((img) => img.status === "pending" && img.file);

        let allImages = [...images]; // Para mantener el orden

        if (pendingImages.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("nombreProducto", nombreProducto);
            formData.append("categoriaSlug", categoriaSlug);
            formData.append("tags", tags.join(","));

            // Agregar archivos pendientes
            pendingImages.forEach((img) => {
            if (img.file) {
                formData.append("images", img.file);
            }
            });

            setUploadProgress(30);

            const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            });

            setUploadProgress(80);

            if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al subir imágenes");
            }

            const data = await response.json();

            // Actualizar las imágenes pendientes con sus public_ids
            let uploadedIndex = 0;
            allImages = images.map((img) => {
            if (img.status === "pending" && img.file) {
                const uploaded = data.images[uploadedIndex++];
                return {
                ...img,
                public_id: uploaded.public_id,
                secure_url: uploaded.secure_url,
                status: "done" as const,
                };
            }
            return img;
            });

            setUploadProgress(100);
        } catch (error: unknown) {
            const message =
            error instanceof Error ? error.message : "Error al subir imágenes";
            setUploadError(message);
            throw error;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
        }

        // Construir resultado final en el orden correcto
        const orderedPublicIds = allImages
        .filter((img) => img.public_id && img.public_id.trim() !== "")
        .map((img) => img.public_id);

        const mainImage = allImages.find((img) => img.isMain && img.public_id && img.public_id.trim() !== "");
        const imagenPrincipal = mainImage?.public_id || orderedPublicIds[0] || "";

        const additionalIds = orderedPublicIds.filter((id) => id !== imagenPrincipal);

        // URLs para compatibilidad legacy
        const imagenUrl = imagenPrincipal
        ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${imagenPrincipal}`
        : "";

        const imagenesAdicionales = additionalIds.map(
        (id) =>
            `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${id}`
        );

        return {
        imagenes: orderedPublicIds,
        imagenPrincipal,
        imagenUrl,
        imagenesAdicionales,
        };
    };

    return {
        uploadPendingImages,
        isUploading,
        uploadProgress,
        uploadError,
    };
    }