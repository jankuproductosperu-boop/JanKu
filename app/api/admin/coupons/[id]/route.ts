import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { cuponActualizarSchema } from "@/server/validation/coupon.schema";
import { actualizarCupon } from "@/server/services/coupon.service";

// Sin DELETE: un cupón se desactiva con `activo: false` (N1-3; los pedidos lo referencian).
export const PATCH = handle(async (req, ctx) => {
  await requireAdmin("cupones.gestionar");
  const { id } = await ctx.params;
  const datos = cuponActualizarSchema.parse(await req.json());
  return json(await actualizarCupon(id, datos));
});
