import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import { obtenerEstadisticas } from "@/server/services/analytics.service";
import { analyticsQuerySchema } from "@/server/validation/analytics.schema";

// Fase 23b (D-85): estadísticas de Google Analytics, solo superadmin.
export const GET = handle(async (req) => {
  await requireAdmin("estadisticas.ver");
  const { rango } = analyticsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await obtenerEstadisticas(rango));
});
