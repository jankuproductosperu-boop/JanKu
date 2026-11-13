import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { bannerActualizarSchema } from "@/server/validation/banner.schema";
import { actualizarBanner, eliminarBanner, obtenerBanner } from "@/server/services/banner.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await obtenerBanner(id));
});

export const PUT = handle(async (req, ctx) => {
  await requireAdmin("catalogo.editar");
  const { id } = await ctx.params;
  const datos = bannerActualizarSchema.parse(await req.json());
  return json(await actualizarBanner(id, datos));
});

export const DELETE = handle(async (_req, ctx) => {
  await requireAdmin("catalogo.editar");
  const { id } = await ctx.params;
  await eliminarBanner(id);
  return json({ message: "Banner eliminado correctamente", success: true });
});
