import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { seguridadVerificarSchema } from "@/server/validation/seguridad.schema";
import { regenerarCodigosRescate } from "@/server/services/admin-user.service";

// Fase 26b: 8 códigos de rescate nuevos (los anteriores dejan de valer). Pide contraseña y código.
export const POST = handle(async (req) => {
  const admin = await requireAdmin(undefined, { permitirSin2fa: true });
  const { password, codigo } = seguridadVerificarSchema.parse(await req.json());
  const codigosRescate = await regenerarCodigosRescate(admin.id, password, codigo);
  return json({ codigosRescate }, { headers: { "Cache-Control": "no-store" } });
});
