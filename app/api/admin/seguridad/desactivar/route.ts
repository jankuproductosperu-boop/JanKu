import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { firmarAdmin, ponerCookieAdmin } from "@/server/auth/session";
import { seguridadVerificarSchema } from "@/server/validation/seguridad.schema";
import { desactivar2fa, estadoSeguridad } from "@/server/services/admin-user.service";

// Fase 26b: con contraseña y código. Cierra las demás sesiones; esta recibe cookie nueva.
// A un superadmin el panel le vuelve a pedir activarla (sirve para cambiar de celular).
export const POST = handle(async (req) => {
  const admin = await requireAdmin(undefined, { permitirSin2fa: true });
  const { password, codigo } = seguridadVerificarSchema.parse(await req.json());
  const sesion = await desactivar2fa(admin.id, password, codigo);
  await ponerCookieAdmin(await firmarAdmin(sesion));
  return json(await estadoSeguridad(admin.id), { headers: { "Cache-Control": "no-store" } });
});
