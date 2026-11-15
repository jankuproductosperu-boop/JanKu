import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { cuponCrearSchema } from "@/server/validation/coupon.schema";
import { crearCupon, listarCupones } from "@/server/services/coupon.service";

export const GET = handle(async () => {
  await requireAdmin("cupones.gestionar");
  return json(await listarCupones());
});

// Código repetido → 409 DUPLICADO (lo traduce handle desde el índice único).
export const POST = handle(async (req) => {
  const admin = await requireAdmin("cupones.gestionar");
  const datos = cuponCrearSchema.parse(await req.json());
  return json(await crearCupon(datos, { adminId: admin.id }), { status: 201 });
});
