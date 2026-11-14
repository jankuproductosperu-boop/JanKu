import { requireUser } from "@/server/auth/guards";
import { SECURITY_HEADERS, handle, json } from "@/server/http/respond";
import { listarPedidosDeUsuario } from "@/server/services/order.service";

export const GET = handle(async () => {
  const usuario = await requireUser();
  return json(await listarPedidosDeUsuario(usuario.id), { headers: SECURITY_HEADERS });
});
