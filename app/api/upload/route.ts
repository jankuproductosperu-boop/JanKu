import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { subirImagenes } from "@/server/services/upload.service";
import { uploadCamposSchema } from "@/server/validation/upload.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (request: NextRequest) => {
  await requireAdmin("catalogo.editar");
  const formData = await request.formData();

  const campos = uploadCamposSchema.parse({
    entity: formData.get("entity"),
    nombreProducto: formData.get("nombreProducto"),
    categoriaSlug: formData.get("categoriaSlug"),
    tags: formData.get("tags"),
    existingCount: formData.get("existingCount"),
    bannerNombre: formData.get("bannerNombre"),
    bannerSubcarpeta: formData.get("bannerSubcarpeta"),
    promocionNombre: formData.get("promocionNombre"),
    promocionSubcarpeta: formData.get("promocionSubcarpeta"),
  });

  const archivos = formData.getAll("images").filter((x): x is File => typeof x !== "string");

  const images = await subirImagenes({
    archivos,
    entidad: campos.entity,
    producto: {
      nombre: campos.nombreProducto ?? "",
      categoriaSlug: campos.categoriaSlug ?? "",
      tags: campos.tags ? campos.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      existentes: campos.existingCount,
    },
    banner: { nombre: campos.bannerNombre ?? "", subcarpeta: campos.bannerSubcarpeta },
    promocion: { nombre: campos.promocionNombre ?? "", subcarpeta: campos.promocionSubcarpeta },
  });

  return json({ success: true, images, entity: campos.entity });
});
