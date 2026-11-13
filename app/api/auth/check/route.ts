import { handle, json } from "@/server/http/respond";
import { AppError } from "@/server/http/errors";
import { requireAdmin } from "@/server/auth/guards";

export const GET = handle(async () => {
  try {
    const { username, nombre, rol, permisos } = await requireAdmin();
    return json({ authenticated: true, admin: { username, nombre, rol, permisos } });
  } catch (err) {
    // Misma respuesta que antes de la fase 08 cuando no hay sesión válida.
    if (err instanceof AppError && err.status === 401) {
      return json({ authenticated: false }, { status: 401 });
    }
    throw err;
  }
});
