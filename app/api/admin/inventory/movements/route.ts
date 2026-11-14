import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { movimientosQuerySchema } from "@/server/validation/inventory.schema";
import { listarMovimientos } from "@/server/services/inventory.service";

export const GET = handle(async (req) => {
  await requireAdmin("inventario.ver");
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const consulta = movimientosQuerySchema.parse(params);
  return json(await listarMovimientos(consulta));
});
