    import { NextRequest, NextResponse } from "next/server";
    import {
    uploadToCloudinary,
    generatePublicId,
    generateBannerPublicId,
    generatePromocionPublicId,
    generateSlug,
    } from "@/lib/cloudinary";

    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";

    // Tipos de entidad que soporta el endpoint
    type UploadEntity = "producto" | "banner" | "promocion";
    type BannerSubcarpeta = "home" | "categorias" | "campanas";
    type PromocionSubcarpeta = "ofertas" | "combos" | "publicidad";

    export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const files = formData.getAll("images") as File[];
        const entity = (formData.get("entity") as UploadEntity) || "producto";

        // Campos para productos
        const nombreProducto = formData.get("nombreProducto") as string;
        const categoriaSlug = formData.get("categoriaSlug") as string;
        const tags = formData.get("tags") as string;

        // Campos para banners
        const bannerNombre = formData.get("bannerNombre") as string;
        const bannerSubcarpeta = (formData.get("bannerSubcarpeta") as BannerSubcarpeta) || "home";

        // Campos para promociones
        const promocionNombre = formData.get("promocionNombre") as string;
        const promocionSubcarpeta = (formData.get("promocionSubcarpeta") as PromocionSubcarpeta) || "ofertas";

        if (!files || files.length === 0) {
        return NextResponse.json(
            { error: "No se recibieron imágenes" },
            { status: 400 }
        );
        }

        const maxImages = entity === "producto" ? 10 : 1;
        if (files.length > maxImages) {
        return NextResponse.json(
            { error: `Máximo ${maxImages} imagen(es) para ${entity}` },
            { status: 400 }
        );
        }

        const tagsList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

        const uploadPromises = files.map(async (file, index) => {
        if (!file.type.startsWith("image/")) {
            throw new Error(`El archivo ${file.name} no es una imagen válida`);
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new Error(`${file.name} supera el límite de 5MB`);
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Generar public_id según la entidad
        let publicId: string;
        if (entity === "banner") {
            publicId = generateBannerPublicId(bannerSubcarpeta, bannerNombre);
        } else if (entity === "promocion") {
            publicId = generatePromocionPublicId(promocionSubcarpeta, promocionNombre);
        } else {
            // producto — incluye categoría dinámica
            const productoSlug = generateSlug(nombreProducto || "producto");
            const categoriaSlugClean = generateSlug(categoriaSlug || "general");
            publicId = generatePublicId(categoriaSlugClean, productoSlug, index);
            tagsList.push(categoriaSlugClean, productoSlug);
        }

        const result = await uploadToCloudinary(buffer, publicId, { tags: tagsList });

        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            index,
        };
        });

        const results = await Promise.all(uploadPromises);
        console.log(`✅ ${results.length} imagen(es) subidas — entidad: ${entity}`);

        return NextResponse.json({ success: true, images: results, entity });
    } catch (error: unknown) {
        console.error("❌ Error en upload:", error);
        const message =
        error instanceof Error ? error.message : "Error al subir imágenes";
        return NextResponse.json({ error: message }, { status: 500 });
    }
    }