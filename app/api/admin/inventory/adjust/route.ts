import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { ajusteStockSchema } from "@/server/validation/inventory.schema";
import { ajustarStock } from "@/server/services/inventory.service";

export const POST = handle(async (req) => {
  const admin = await requireAdmin("inventario.editar");
  const datos = ajusteStockSchema.parse(await req.json());
  return json(await ajustarStock({ ...datos, actor: { adminId: admin.id } }));
});
