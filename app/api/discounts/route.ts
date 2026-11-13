import { handle, json } from "@/server/http/respond";
import { nivelCrearSchema } from "@/server/validation/discount.schema";
import { crearNivel, listarNiveles } from "@/server/services/discount.service";

export const GET = handle(async () => json(await listarNiveles()));

export const POST = handle(async (req) => {
  const datos = nivelCrearSchema.parse(await req.json());
  return json(await crearNivel(datos), { status: 201 });
});
