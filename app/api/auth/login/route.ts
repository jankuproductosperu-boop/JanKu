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

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const clientIP = obtenerIP(headersList);

    // ── 1. Verificar si la IP está bloqueada (persistente en MongoDB) ─────
    const estado = await consultar("login-admin", "ip", clientIP);
    if (estado.bloqueado) {
      log.warn("login_admin.bloqueado", { ip: clientIP });
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Bloqueado por ${estado.minutosRestantes} minutos.`,
          blocked: true,
          remainingTime: estado.minutosRestantes,
        },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    // ── 2. Validar y parsear el body ─────────────────────────────────────
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de solicitud inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { username, password } = body;

    // Validación básica de inputs (no consume intentos)
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Cada fallo de credenciales cuenta un intento y responde igual
    const fallo = async (motivo: string) => {
      const r = await registrarIntento("login-admin", "ip", clientIP);
      log.warn("login_admin.fallo", { motivo, ip: clientIP, restantes: r.restantes });
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos", remainingAttempts: r.restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    };

    // Limitar longitud para prevenir ataques
    if (typeof username !== "string" || typeof password !== "string" || username.length > 50 || password.length > 200) {
      return fallo("entrada_larga");
    }

    // ── 3. Buscar usuario en BD ──────────────────────────────────────────
    await connectDB();
    const user = await AdminUser.findOne({
      username: username.trim(),
      activo: true,
    });

    if (!user) return fallo("usuario");

    // ── 4. Verificar contraseña ──────────────────────────────────────────
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return fallo("password");

    // ── 5. Login exitoso ─────────────────────────────────────────────────
    await reiniciar("login-admin", "ip", clientIP);
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
