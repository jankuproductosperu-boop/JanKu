import { getOptionalUser } from "@/server/auth/guards";
import { SECURITY_HEADERS, handle, json } from "@/server/http/respond";
import { obtenerPedidoPublico } from "@/server/services/order.service";

export const GET = handle(async (req, ctx) => {
  const { codigo } = await ctx.params;
  const token = req.nextUrl.searchParams.get("t") ?? undefined;
  const usuario = await getOptionalUser();
  const pedido = await obtenerPedidoPublico(codigo, { token, userId: usuario?.id });
  return json(pedido, { headers: SECURITY_HEADERS });
});
