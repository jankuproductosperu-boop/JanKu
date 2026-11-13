import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { adminCrearSchema } from "@/server/validation/admin-user.schema";
import { crearAdmin, listarAdmins } from "@/server/services/admin-user.service";

export const GET = handle(async () => {
  await requireAdmin("admins.gestionar");
  return json(await listarAdmins());
});

export const POST = handle(async (req) => {
  const actor = await requireAdmin("admins.gestionar");
  const datos = adminCrearSchema.parse(await req.json());
  return json(await crearAdmin(datos, { adminId: actor.id }), { status: 201 });
});
