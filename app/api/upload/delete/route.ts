    import { NextRequest, NextResponse } from "next/server";
    import { deleteFromCloudinary } from "@/server/cloudinary";
    import { handle } from "@/server/http/respond";
    import { requireAdmin } from "@/server/auth/guards";

    export const runtime = "nodejs";

    // requireAdmin() va fuera del try: su 401/403 lo responde handle().
    export const DELETE = handle(async (request: NextRequest) => {
    await requireAdmin("catalogo.editar");
    try {
        const { publicId } = await request.json();

        if (!publicId) {
        return NextResponse.json(
            { error: "Se requiere publicId" },
            { status: 400 }
        );
        }

        // Seguridad: solo permitir public_ids de la carpeta "productos/"
        if (!publicId.startsWith("productos/")) {
        return NextResponse.json(
            { error: "public_id no permitido" },
            { status: 403 }
        );
        }

        await deleteFromCloudinary(publicId);

        return NextResponse.json({
        success: true,
        deleted: publicId,
        });
    } catch (error: unknown) {
        console.error("❌ Error eliminando imagen:", error);
        const message =
        error instanceof Error ? error.message : "Error al eliminar imagen";
        return NextResponse.json({ error: message }, { status: 500 });
    }
    });