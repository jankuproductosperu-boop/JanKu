import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { promocionCrearSchema } from "@/server/validation/promotion.schema";
import { crearPromocion, listarPromocionesActivas } from "@/server/services/promotion.service";

export const GET = handle(async () => json(await listarPromocionesActivas()));

export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");
  const datos = promocionCrearSchema.parse(await req.json());
  return json(await crearPromocion(datos));
});
