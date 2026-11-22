import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { firmarAdmin, ponerCookieAdmin } from "@/server/auth/session";
import { seguridadConfirmarSchema } from "@/server/validation/seguridad.schema";
import { confirmarActivacion2fa } from "@/server/services/admin-user.service";

// Fase 26b: el primer código de la app activa la 2FA. Se cierran las demás sesiones (tokenVersion + 1)
// y esta recibe una cookie nueva. Los códigos de rescate se devuelven solo en esta respuesta.
export const POST = handle(async (req) => {
  const admin = await requireAdmin(undefined, { permitirSin2fa: true });
  const { codigo } = seguridadConfirmarSchema.parse(await req.json());
  const { codigosRescate, sesion } = await confirmarActivacion2fa(admin.id, codigo);
  await ponerCookieAdmin(await firmarAdmin(sesion));
  return json({ codigosRescate }, { headers: { "Cache-Control": "no-store" } });
});
