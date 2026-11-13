import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { listarPromociones } from "@/server/services/promotion.service";

export const GET = handle(async () => {
  await requireAdmin("catalogo.editar");
  return json(await listarPromociones());
});
