import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { puntoActualizarSchema } from "@/server/validation/deliveryPoint.schema";
import { actualizarPunto } from "@/server/services/deliveryPoint.service";

// Sin DELETE: un punto se desactiva con `activo: false` (D-72, N1-3).
export const PUT = handle(async (req, ctx) => {
  await requireAdmin("catalogo.editar");
  const { id } = await ctx.params;
  const datos = puntoActualizarSchema.parse(await req.json());
  return json(await actualizarPunto(id, datos));
});
