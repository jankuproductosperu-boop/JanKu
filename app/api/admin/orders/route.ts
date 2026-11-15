import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { listarPedidosAdmin } from "@/server/services/order.service";
import { pedidoListaQuerySchema } from "@/server/validation/order.schema";

export const GET = handle(async (req) => {
  await requireAdmin("pedidos.ver");
  const query = pedidoListaQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await listarPedidosAdmin(query));
});
