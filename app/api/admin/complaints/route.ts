import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { listarReclamos } from "@/server/services/complaint.service";
import { reclamoListaQuerySchema } from "@/server/validation/complaint.schema";

// D-82: los permisos de reclamos son los de pedidos.
export const GET = handle(async (req) => {
  await requireAdmin("pedidos.ver");
  const query = reclamoListaQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await listarReclamos(query));
});
