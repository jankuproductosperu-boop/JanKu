import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  COOKIE_ADMIN_2FA,
  borrarCookie2fa,
  firmarAdmin,
  leerCookie,
  ponerCookieAdmin,
  verificarPendiente2fa,
} from "@/server/auth/session";
import { obtenerIP } from "@/server/auth/ip";
import { consultar, registrarIntento, reiniciar } from "@/server/auth/rateLimit";
import { SECURITY_HEADERS } from "@/server/http/respond";
import { log } from "@/server/logger";
import { login2faSchema } from "@/server/validation/seguridad.schema";
import { registrarAccesoAdmin, verificarSegundoPaso } from "@/server/services/admin-user.service";

// Fase 26b: segundo paso del login del panel. Solo vale con la cookie admin-2fa que deja
// /api/auth/login tras una contraseña correcta (5 min). Respuestas con la misma forma que el login.

const responder = (cuerpo: Record<string, unknown>, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: SECURITY_HEADERS });

export async function POST(request: Request) {
  try {
    const clientIP = obtenerIP(await headers());

    // ── 1. Paso pendiente: sin cookie válida se vuelve a empezar ──────────
    const token = await leerCookie(COOKIE_ADMIN_2FA);
    const pendiente = token ? await verificarPendiente2fa(token) : null;
    if (!pendiente) {
      return responder(
        { error: "La verificación venció. Vuelve a iniciar sesión.", code: "2FA_VENCIDA" },
        401,
      );
    }

    const bloqueado = (minutos?: number) => {
      const m = minutos ?? 15;
      log.warn("login_admin.2fa_bloqueado", { ip: clientIP });
      return responder(
        { error: `Demasiados intentos fallidos. Bloqueado por ${m} minutos.`, blocked: true, remainingTime: m },
        429,
      );
    };

    // ── 2. Bloqueo por cuenta ────────────────────────────────────────────
    const estado = await consultar("login-2fa", "user", pendiente.id);
    if (estado.bloqueado) return bloqueado(estado.minutosRestantes);

    // ── 3. Cuerpo ───────────────────────────────────────────────────────
    let crudo: unknown;
    try {
      crudo = await request.json();
    } catch {
      return responder({ error: "Formato de solicitud inválido" }, 400);
    }
    const cuerpo = login2faSchema.safeParse(crudo);
    if (!cuerpo.success) return responder({ error: "Escribe el código" }, 400);

    // ── 4. El intento se cuenta ANTES de comprobar (D-18) ─────────────────
    const intento = await registrarIntento("login-2fa", "user", pendiente.id);
    if (!intento.dentroDelLimite) return bloqueado(intento.minutosRestantes);

    const r = await verificarSegundoPaso(pendiente, cuerpo.data.codigo);
    if (!r) {
      log.warn("login_admin.2fa_fallo", { ip: clientIP, restantes: intento.restantes });
      return responder({ error: "Código incorrecto", remainingAttempts: intento.restantes }, 401);
    }

    // ── 5. Sesión normal ─────────────────────────────────────────────────
    await reiniciar("login-2fa", "user", pendiente.id);
    await borrarCookie2fa();
    await registrarAccesoAdmin(r.sesion.id, clientIP);
    await ponerCookieAdmin(await firmarAdmin(r.sesion));

    log.info("login_admin.ok", { ip: clientIP, metodo: r.metodo });
    return responder({
      success: true,
      username: r.sesion.username,
      ...(r.metodo === "rescate" ? { codigosRescateRestantes: r.restantes } : {}),
    });
  } catch (error) {
    log.error("login_admin.2fa_error", error);
    return responder({ error: "Error en el servidor" }, 500);
  }
}
