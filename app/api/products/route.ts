import { handle, json } from "@/server/http/respond";
import { productoCrearSchema } from "@/server/validation/product.schema";
import { crearProducto, listarProductos } from "@/server/services/product.service";

export const GET = handle(async () => json(await listarProductos()));

export const POST = handle(async (req) => {
  const datos = productoCrearSchema.parse(await req.json());
  return json(await crearProducto(datos));
});
