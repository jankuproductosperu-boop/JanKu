import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { obtenerReclamo, responderReclamo } from "@/server/services/complaint.service";
import { reclamoResponderSchema } from "@/server/validation/complaint.schema";

// D-82: ver con `pedidos.ver`; responder con `pedidos.gestionar`.
export const GET = handle(async (_req, ctx) => {
  await requireAdmin("pedidos.ver");
  const { id } = await ctx.params;
  return json(await obtenerReclamo(id));
});

export const PATCH = handle(async (req, ctx) => {
  const admin = await requireAdmin("pedidos.gestionar");
  const { id } = await ctx.params;
  const datos = reclamoResponderSchema.parse(await req.json());
  return json(await responderReclamo(id, datos, { adminId: admin.id, adminNombre: admin.nombre || admin.username }));
});
