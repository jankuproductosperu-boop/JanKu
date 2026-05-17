    import { v2 as cloudinary } from "cloudinary";

    cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    });

    export type CloudinaryUploadResult = {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    };

    export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    export function generatePublicId(
    categoriaSlug: string,
    productoSlug: string,
    index: number
    ): string {
    const cat = generateSlug(categoriaSlug || "general");
    const prod = generateSlug(productoSlug || "producto");
    const ts = Date.now();
    return `productos/${cat}/${prod}-${index + 1}-${ts}`;
    }

    export function generateBannerPublicId(
    subcarpeta: "home" | "categorias" | "campanas",
    nombre: string
    ): string {
    const nombreSlug = generateSlug(nombre || "banner");
    return `banners/${subcarpeta}/${nombreSlug}`;
    }

    export function generatePromocionPublicId(
    subcarpeta: "ofertas" | "combos" | "publicidad",
    nombre: string
    ): string {
    const nombreSlug = generateSlug(nombre || "promocion");
    return `promociones/${subcarpeta}/${nombreSlug}`;
    }

    export async function uploadToCloudinary(
    buffer: Buffer,
    publicId: string,
    options: { folder?: string; tags?: string[] } = {}
    ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
        const uploadOptions: Record<string, unknown> = {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
        tags: options.tags || [],
        };

        if (options.folder) {
        uploadOptions.folder = options.folder;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
            if (error) {
            console.error("❌ Error Cloudinary upload:", error);
            reject(error);
            return;
            }
            if (!result) {
            reject(new Error("No result from Cloudinary"));
            return;
            }
            resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            });
        }
        );

        uploadStream.end(buffer);
    });
    }

    export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Imagen eliminada: ${publicId}`);
    } catch (error) {
        console.error(`❌ Error eliminando imagen ${publicId}:`, error);
        throw error;
    }
    }

    export function getCloudinaryUrl(
    publicId: string,
    options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string;
    } = {}
    ): string {
    const { width, height, crop = "fill", quality = "auto" } = options;

    const transformations: string[] = [`f_auto`, `q_${quality}`];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (width || height) transformations.push(`c_${crop}`);

    const transformation = transformations.join(",");
    // Funciona en servidor (CLOUDINARY_CLOUD_NAME) y en cliente (NEXT_PUBLIC_)
    const cloudName =
        process.env.CLOUDINARY_CLOUD_NAME ||
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
    }

    export default cloudinary;