import { handle, json } from "@/server/http/respond";
import { nivelActualizarSchema } from "@/server/validation/discount.schema";
import { actualizarNivel, eliminarNivel, obtenerNivel } from "@/server/services/discount.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await obtenerNivel(id));
});

export const PUT = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const datos = nivelActualizarSchema.parse(await req.json());
  return json(await actualizarNivel(id, datos));
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  await eliminarNivel(id);
  return json({ message: "Descuento eliminado correctamente", success: true });
});
