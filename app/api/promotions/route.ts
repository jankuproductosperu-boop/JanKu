import { handle, json } from "@/server/http/respond";
import { promocionCrearSchema } from "@/server/validation/promotion.schema";
import { crearPromocion, listarPromocionesActivas } from "@/server/services/promotion.service";

export const GET = handle(async () => json(await listarPromocionesActivas()));

export const POST = handle(async (req) => {
  const datos = promocionCrearSchema.parse(await req.json());
  return json(await crearPromocion(datos));
});
