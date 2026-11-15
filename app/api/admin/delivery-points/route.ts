import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { puntoCrearSchema } from "@/server/validation/deliveryPoint.schema";
import { crearPunto, listarPuntos } from "@/server/services/deliveryPoint.service";

export const GET = handle(async () => {
  await requireAdmin("catalogo.editar");
  return json(await listarPuntos());
});

export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");
  const datos = puntoCrearSchema.parse(await req.json());
  return json(await crearPunto(datos), { status: 201 });
});
