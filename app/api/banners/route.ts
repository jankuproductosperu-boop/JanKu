import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { bannerCrearSchema } from "@/server/validation/banner.schema";
import { crearBanner, listarBannersActivos } from "@/server/services/banner.service";

export const GET = handle(async () => json(await listarBannersActivos()));

export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");
  const datos = bannerCrearSchema.parse(await req.json());
  return json(await crearBanner(datos));
});
