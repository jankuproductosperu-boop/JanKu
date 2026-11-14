import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { productoCrearSchema } from "@/server/validation/product.schema";
import { crearProducto, listarProductosPublicos } from "@/server/services/product.service";

export const GET = handle(async () => json(await listarProductosPublicos()));

export const POST = handle(async (req) => {
  const admin = await requireAdmin("catalogo.editar");
  const datos = productoCrearSchema.parse(await req.json());
  return json(await crearProducto(datos, { adminId: admin.id }));
});
