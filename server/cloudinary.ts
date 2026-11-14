import "server-only";
    import { v2 as cloudinary } from "cloudinary";
    import { slugify } from "@/lib/slug";
    import { log } from "@/server/logger";

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

    export const generateSlug = slugify;

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
    return `banners/${subcarpeta}/${nombreSlug}-${Date.now()}`;
    }

    export function generatePromocionPublicId(
    subcarpeta: "ofertas" | "combos" | "publicidad",
    nombre: string
    ): string {
    const nombreSlug = generateSlug(nombre || "promocion");
    return `promociones/${subcarpeta}/${nombreSlug}-${Date.now()}`;
    }

    export async function uploadToCloudinary(
    buffer: Buffer,
    publicId: string,
    options: { folder?: string; tags?: string[]; overwrite?: boolean } = {}
    ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
        const uploadOptions: Record<string, unknown> = {
        public_id: publicId,
        overwrite: options.overwrite ?? false,
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
            log.error("cloudinary_subida_fallida", error);
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
        log.info("imagen_eliminada", { publicId });
    } catch (error) {
        log.error("cloudinary_eliminar_fallido", error, { publicId });
        throw error;
    }
    }

    export default cloudinary;