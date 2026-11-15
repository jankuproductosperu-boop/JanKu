import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { caducarPendientes } from "@/server/services/order.service";

export const POST = handle(async () => {
  await requireAdmin("pedidos.gestionar");
  return json(await caducarPendientes());
});
