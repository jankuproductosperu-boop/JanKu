import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { listarBanners } from "@/server/services/banner.service";

export const GET = handle(async () => {
  await requireAdmin("catalogo.editar");
  return json(await listarBanners());
});
