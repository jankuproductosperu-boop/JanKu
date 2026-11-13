import { handle, json } from "@/server/http/respond";
import { AppError } from "@/server/http/errors";
import { promocionActualizarSchema } from "@/server/validation/promotion.schema";
import {
  actualizarPromocion,
  eliminarPromocion,
  obtenerPromocion,
} from "@/server/services/promotion.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const promocion = await obtenerPromocion(id);
  if (!promocion) throw new AppError(404, "Promoción no encontrada", "NO_ENCONTRADO");
  return json(promocion);
});

export const PUT = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const datos = promocionActualizarSchema.parse(await req.json());
  return json(await actualizarPromocion(id, datos));
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  await eliminarPromocion(id);
  return json({ message: "Promoción eliminada correctamente", success: true });
});
