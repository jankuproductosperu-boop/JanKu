import { handle, json } from "@/server/http/respond";
import { AppError } from "@/server/http/errors";
import { requireAdmin } from "@/server/auth/guards";

export const GET = handle(async () => {
  try {
    // Fase 26b: deja pasar al superadmin sin 2FA y le dice al panel que debe activarla.
    // Campos añadidos, opcionales para el cliente: admin.totpActivo y activar2fa (N1-6).
    const { username, nombre, rol, permisos, totpActivo } = await requireAdmin(undefined, { permitirSin2fa: true });
    const activar2fa = rol === "superadmin" && !totpActivo;
    return json({ authenticated: true, admin: { username, nombre, rol, permisos, totpActivo: !!totpActivo }, activar2fa });
  } catch (err) {
    // Misma respuesta que antes de la fase 08 cuando no hay sesión válida.
    if (err instanceof AppError && err.status === 401) {
      return json({ authenticated: false }, { status: 401 });
    }
    throw err;
  }
});
