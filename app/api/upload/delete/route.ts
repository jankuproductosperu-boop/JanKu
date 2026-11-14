import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { entradaInvalida } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import { eliminarImagen } from "@/server/services/upload.service";
import { eliminarImagenSchema } from "@/server/validation/upload.schema";

export const runtime = "nodejs";

export const DELETE = handle(async (request: NextRequest) => {
  await requireAdmin("catalogo.editar");
  const cuerpo = eliminarImagenSchema.safeParse(await request.json());
  if (!cuerpo.success) {
    throw entradaInvalida({ publicId: "Se requiere publicId" }, "Se requiere publicId");
  }
  await eliminarImagen(cuerpo.data.publicId);
  return json({ success: true, deleted: cuerpo.data.publicId });
});
