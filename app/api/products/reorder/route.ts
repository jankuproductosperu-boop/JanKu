import { handle, json } from "@/server/http/respond";
import { reordenarSchema } from "@/server/validation/product.schema";
import { reordenarProductos } from "@/server/services/product.service";

export const POST = handle(async (req) => {
  const { context, orden } = reordenarSchema.parse(await req.json());
  const { actualizados } = await reordenarProductos(context, orden);
  return json({ success: true, actualizados });
});
