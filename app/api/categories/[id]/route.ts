import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { categoriaActualizarSchema } from "@/server/validation/category.schema";
import {
  actualizarCategoria,
  eliminarCategoria,
  obtenerCategoria,
} from "@/server/services/category.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await obtenerCategoria(id));
});

export const PUT = handle(async (req, ctx) => {
  await requireAdmin("catalogo.editar");
  const { id } = await ctx.params;
  const datos = categoriaActualizarSchema.parse(await req.json());
  return json(await actualizarCategoria(id, datos));
});

export const DELETE = handle(async (_req, ctx) => {
  await requireAdmin("catalogo.editar");
  const { id } = await ctx.params;
  await eliminarCategoria(id);
  return json({ message: "Categoría eliminada correctamente", success: true });
});
