import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { estadoSeguridad } from "@/server/services/admin-user.service";

// Fase 26b: estado de la verificación en dos pasos de la cuenta propia. Cualquier rol.
// permitirSin2fa: es la pantalla donde el superadmin la activa.
export const GET = handle(async () => {
  const admin = await requireAdmin(undefined, { permitirSin2fa: true });
  return json(await estadoSeguridad(admin.id), { headers: { "Cache-Control": "no-store" } });
});
