import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { listarProductosAdmin } from "@/server/services/product.service";

export const GET = handle(async () => {
  const admin = await requireAdmin("inventario.ver");
  return json(await listarProductosAdmin({ incluirCostos: admin.permisos.includes("costos.ver") }));
});
