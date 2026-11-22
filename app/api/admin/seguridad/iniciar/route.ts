import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { seguridadIniciarSchema } from "@/server/validation/seguridad.schema";
import { iniciarActivacion2fa } from "@/server/services/admin-user.service";

// Fase 26b: con la contraseña, genera el secreto pendiente. Devuelve la clave y el enlace
// otpauth:// para que el navegador dibuje el QR (sin servicios externos).
export const POST = handle(async (req) => {
  const admin = await requireAdmin(undefined, { permitirSin2fa: true });
  const { password } = seguridadIniciarSchema.parse(await req.json());
  return json(await iniciarActivacion2fa(admin.id, password), { headers: { "Cache-Control": "no-store" } });
});
