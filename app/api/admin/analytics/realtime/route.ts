import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { obtenerTiempoReal } from "@/server/services/analytics.service";

// Fase 23b (D-85): usuarios activos en los últimos 30 minutos, solo superadmin.
export const GET = handle(async () => {
  await requireAdmin("estadisticas.ver");
  return json(await obtenerTiempoReal());
});
