import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/server/db";
import AdminUser from "@/models/AdminUser";
import bcrypt from "bcryptjs";
import { firmarAdmin, ponerCookieAdmin } from "@/server/auth/session";
import { obtenerIP } from "@/server/auth/ip";
import { consultar, registrarIntento, reiniciar } from "@/server/auth/rateLimit";
import { SECURITY_HEADERS } from "@/server/http/respond";
import { log } from "@/server/logger";
import { loginAdminCuerpoSchema } from "@/server/validation/auth.schema";

// Hash bcrypt (coste 12) de un valor aleatorio que nadie conoce. Se compara contra él cuando el
// usuario no existe, para que el tiempo de respuesta no revele qué usuarios existen.
const HASH_FICTICIO = "$2b$12$XPEs8KzRWsDpK3aYvSZWFO15/TocCiDt0zCWtljwRAXEn/4sKgS/i";

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const clientIP = obtenerIP(headersList);

    const bloqueado = (minutos?: number) => {
      const m = minutos ?? 15;
      log.warn("login_admin.bloqueado", { ip: clientIP });
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Bloqueado por ${m} minutos.`,
          blocked: true,
          remainingTime: m,
        },
        { status: 429, headers: SECURITY_HEADERS }
      );
    };

    // ── 1. Verificar si la IP está bloqueada (persistente en MongoDB) ─────
    const estado = await consultar("login-admin", "ip", clientIP);
    if (estado.bloqueado) return bloqueado(estado.minutosRestantes);

    // ── 2. Validar y parsear el body ─────────────────────────────────────
    let crudo: unknown;
    try {
      crudo = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de solicitud inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Fase 26a (D-89): un tipo equivocado se trata igual que un JSON mal formado.
    const cuerpo = loginAdminCuerpoSchema.safeParse(crudo);
    if (!cuerpo.success) {
      return NextResponse.json(
        { error: "Formato de solicitud inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    const body = cuerpo.data;

    const { username, password } = body;

    // Validación básica de inputs (no consume intentos)
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Limitar longitud para prevenir ataques (cuenta como fallo, como antes)
    if (typeof username !== "string" || typeof password !== "string" || username.length > 50 || password.length > 200) {
      const r = await registrarIntento("login-admin", "ip", clientIP);
      log.warn("login_admin.fallo", { motivo: "entrada_larga", ip: clientIP, restantes: r.restantes });
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos", remainingAttempts: r.restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 3. Bloqueo por cuenta: un acierto de otra cuenta no lo reinicia ───
    // Se aplica a cualquier nombre recibido, exista o no, para no revelar usuarios.
    const cuenta = username.trim().toLowerCase();
    const estadoCuenta = await consultar("login-admin", "user", cuenta);
    if (estadoCuenta.bloqueado) return bloqueado(estadoCuenta.minutosRestantes);

    // ── 4. El intento se cuenta ANTES de comparar ────────────────────────
    // Así una ráfaga en paralelo no prueba más contraseñas que el máximo. Un acierto lo borra
    // después, de modo que en la práctica solo cuentan los fallos (D-18).
    const [porIp, porCuenta] = await Promise.all([
      registrarIntento("login-admin", "ip", clientIP),
      registrarIntento("login-admin", "user", cuenta),
    ]);
    if (!porIp.dentroDelLimite || !porCuenta.dentroDelLimite) {
      return bloqueado(Math.max(porIp.minutosRestantes ?? 0, porCuenta.minutosRestantes ?? 0) || undefined);
    }

    const fallo = (motivo: string) => {
      log.warn("login_admin.fallo", { motivo, ip: clientIP, restantes: porIp.restantes });
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos", remainingAttempts: porIp.restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    };

    // ── 5. Buscar usuario y verificar contraseña (mismo coste exista o no) ─
    await connectDB();
    const user = await AdminUser.findOne({
      username: username.trim(),
      activo: true,
    });

    const isValidPassword = await bcrypt.compare(password, user?.password ?? HASH_FICTICIO);
    if (!user) return fallo("usuario");
    if (!isValidPassword) return fallo("password");

    // ── 6. Login exitoso ─────────────────────────────────────────────────
    await Promise.all([
      reiniciar("login-admin", "ip", clientIP),
      reiniciar("login-admin", "user", cuenta),
    ]);
    await AdminUser.findByIdAndUpdate(user._id, { ultimoAcceso: new Date() });

    const token = await firmarAdmin({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    });
    await ponerCookieAdmin(token);

    log.info("login_admin.ok", { ip: clientIP });

    return NextResponse.json(
      { success: true, username: user.username },
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    log.error("login_admin.error", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
