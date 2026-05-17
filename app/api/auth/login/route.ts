// Mejoras:
// 1. Rate limiting más robusto con tiempo de bloqueo en la respuesta
// 2. Headers de seguridad en la respuesta
// 3. Logs de seguridad más detallados
// 4. Validación de inputs antes de consultar la BD

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { loginTracker } from "@/lib/loginAttempts";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import LoginBlock from "@/models/LoginBlock";
function getClientIP(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  // Tomar solo la primera IP si hay varias
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  // Sanitizar la IP
  return ip.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45);
}

// Headers de seguridad para respuestas de auth
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const clientIP = getClientIP(headersList);

    // ── 1. Verificar si la IP está bloqueada ─────────────────────────────
    let blockStatus = loginTracker.isBlocked(clientIP);

  // Si no está en memoria (servidor reiniciado), verificar MongoDB
  if (!blockStatus.blocked) {
    await connectDB();
    const dbBlock = await LoginBlock.findOne({ ip: clientIP });
    if (dbBlock?.blockedUntil && Date.now() < dbBlock.blockedUntil) {
      const remainingTime = Math.ceil((dbBlock.blockedUntil - Date.now()) / 1000 / 60);
      blockStatus = { blocked: true, remainingTime };
    }
  }

  if (blockStatus.blocked) {
      console.warn(`🚫 IP bloqueada intentó acceder: ${clientIP}`);
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Bloqueado por ${blockStatus.remainingTime} minutos.`,
          blocked: true,
          remainingTime: blockStatus.remainingTime,
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

    // Validación básica de inputs
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Limitar longitud para prevenir ataques
    if (username.length > 50 || password.length > 200) {
      loginTracker.recordAttempt(clientIP);
      await LoginBlock.findOneAndUpdate(
      { ip: clientIP },
      {
        $inc: { count: 1 },
        $set: {
          lastAttempt: Date.now(),
          blockedUntil: loginTracker.isBlocked(clientIP).blocked
            ? Date.now() + 15 * 60 * 1000
            : null,
        },
      },
      { upsert: true }
    );
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 3. Buscar usuario en BD ──────────────────────────────────────────
    await connectDB();
    const user = await AdminUser.findOne({
      username: username.trim(),
      activo: true,
    });

    if (!user) {
      loginTracker.recordAttempt(clientIP);
      await LoginBlock.findOneAndUpdate(
        { ip: clientIP },
        {
          $inc: { count: 1 },
          $set: {
            lastAttempt: Date.now(),
            blockedUntil: loginTracker.isBlocked(clientIP).blocked
              ? Date.now() + 15 * 60 * 1000
              : null,
          },
        },
        { upsert: true }
      );
      const remaining = loginTracker.getRemainingAttempts(clientIP);
      console.warn(`❌ Usuario no encontrado: "${username}" desde IP: ${clientIP}`);
      return NextResponse.json(
        {
          error: "Usuario o contraseña incorrectos",
          remainingAttempts: remaining,
        },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 4. Verificar contraseña ──────────────────────────────────────────
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      loginTracker.recordAttempt(clientIP);
      await LoginBlock.findOneAndUpdate(
        { ip: clientIP },
        {
          $inc: { count: 1 },
          $set: {
            lastAttempt: Date.now(),
            blockedUntil: loginTracker.isBlocked(clientIP).blocked
              ? Date.now() + 15 * 60 * 1000
              : null,
          },
        },
        { upsert: true }
      );
      const remaining = loginTracker.getRemainingAttempts(clientIP);
      console.warn(`❌ Contraseña incorrecta para "${username}" desde IP: ${clientIP}`);
      return NextResponse.json(
        {
          error: "Usuario o contraseña incorrectos",
          remainingAttempts: remaining,
        },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 5. Login exitoso ─────────────────────────────────────────────────
    loginTracker.reset(clientIP);
    await LoginBlock.deleteOne({ ip: clientIP });
    await AdminUser.findByIdAndUpdate(user._id, { ultimoAcceso: new Date() });

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        // Incluir versión para poder invalidar tokens viejos si es necesario
        v: 1,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" } // Reducido de 24h a 8h por seguridad
    );

    const cookieStore = await cookies();
    cookieStore.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    console.log(`✅ Login exitoso: ${user.username} desde IP: ${clientIP}`);

    return NextResponse.json(
      { success: true, username: user.username },
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error en login:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}