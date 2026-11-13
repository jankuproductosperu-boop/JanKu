import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { adminActualizarSchema } from "@/server/validation/admin-user.schema";
import { actualizarAdmin } from "@/server/services/admin-user.service";

export const PATCH = handle(async (req, ctx) => {
  const actor = await requireAdmin("admins.gestionar");
  const { id } = await ctx.params;
  const datos = adminActualizarSchema.parse(await req.json());
  return json(await actualizarAdmin(id, datos, { adminId: actor.id }));
});
