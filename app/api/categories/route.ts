import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { categoriaCrearSchema } from "@/server/validation/category.schema";
import { crearCategoria, listarCategorias } from "@/server/services/category.service";

export const GET = handle(async () => json(await listarCategorias()));

export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");
  const datos = categoriaCrearSchema.parse(await req.json());
  return json(await crearCategoria(datos), { status: 201 });
});
