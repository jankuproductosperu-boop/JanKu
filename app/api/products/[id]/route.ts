import { handle, json } from "@/server/http/respond";
import { productoActualizarSchema } from "@/server/validation/product.schema";
import {
  actualizarProducto,
  eliminarProducto,
  obtenerProductoPorId,
} from "@/server/services/product.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await obtenerProductoPorId(id));
});

export const PUT = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const datos = productoActualizarSchema.parse(await req.json());
  return json(await actualizarProducto(id, datos));
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  await eliminarProducto(id);
  return json({ message: "Producto eliminado correctamente", success: true });
});
