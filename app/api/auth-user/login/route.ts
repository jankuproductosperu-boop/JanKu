import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { validarEmail } from "@/server/auth/validators";
import { consultar, registrarIntento, reiniciar } from "@/server/auth/rateLimit";
import { SECURITY_HEADERS } from "@/server/http/respond";
import { obtenerIP } from "@/server/auth/ip";
import { log } from "@/server/logger";

// ── Config de bloqueo por CUENTA (independiente del bloqueo por IP) ──────────
const MAX_INTENTOS_CUENTA = 5;
const BLOQUEO_CUENTA_MS = 15 * 60 * 1000; // 15 minutos

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const clientIP = obtenerIP(headersList);

    // ── 1. Límite por IP (persistente en MongoDB) ─────────────────────────
    const estado = await consultar("login-user", "ip", clientIP);

    if (estado.bloqueado) {
      log.warn("login_user.bloqueado", { ip: clientIP });
      return NextResponse.json(
        {
          error: `Demasiados intentos. Bloqueado por ${estado.minutosRestantes} minutos.`,
          bloqueado: true,
        },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    // ── 2. Parsear y validar body ─────────────────────────────────────────
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Cuenta un fallo por IP (atómico) y devuelve los intentos restantes
    const registrarFalloIP = async () => {
      const r = await registrarIntento("login-user", "ip", clientIP);
      return r.restantes;
    };

    if (typeof email !== "string" || typeof password !== "string" || !validarEmail(email) || password.length > 200) {
      const restantes = await registrarFalloIP();
      return NextResponse.json(
        { error: "Credenciales incorrectas", intentosRestantes: restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 3. Buscar usuario ─────────────────────────────────────────────────
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim(), activo: true });

    // Mismo mensaje si no existe el usuario o la contraseña es incorrecta
    // — evita enumeración de usuarios
    if (!user) {
      const restantes = await registrarFalloIP();
      return NextResponse.json(
        { error: "Credenciales incorrectas", intentosRestantes: restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 4. Verificar si la CUENTA está bloqueada (independiente de la IP) ──
    if (user.bloqueadoHasta && user.bloqueadoHasta.getTime() > Date.now()) {
      const tiempoRestante = Math.ceil((user.bloqueadoHasta.getTime() - Date.now()) / 1000 / 60);
      console.warn(`🚫 Cuenta bloqueada intentó acceder: ${user.email} desde IP: ${clientIP}`);
      return NextResponse.json(
        {
          error: `Esta cuenta está bloqueada temporalmente. Intenta en ${tiempoRestante} minutos.`,
          bloqueado: true,
        },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    // ── 5. Verificar contraseña ───────────────────────────────────────────
    const passwordValida = await bcrypt.compare(password, user.password);
    if (!passwordValida) {
      const restantes = await registrarFalloIP();

      // Incrementar intentos fallidos de LA CUENTA
      const nuevosIntentos = (user.intentosFallidos || 0) + 1;
      const actualizacion: Record<string, unknown> = { intentosFallidos: nuevosIntentos };
      if (nuevosIntentos >= MAX_INTENTOS_CUENTA) {
        actualizacion.bloqueadoHasta = new Date(Date.now() + BLOQUEO_CUENTA_MS);
        console.warn(`🔒 Cuenta bloqueada por intentos fallidos: ${user.email}`);
      }
      await User.findByIdAndUpdate(user._id, actualizacion);

      return NextResponse.json(
        { error: "Credenciales incorrectas", intentosRestantes: restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 6. Verificar que el email esté confirmado ─────────────────────────
    if (!user.emailVerificado) {
      return NextResponse.json(
        { error: "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja." },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // ── 7. Login exitoso — resetear TODO (IP y cuenta) ──────────────────────
    await reiniciar("login-user", "ip", clientIP);
    await User.findByIdAndUpdate(user._id, {
      ultimoAcceso: new Date(),
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });

    // JWT separado del admin — usa una secret diferente
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        nombre: user.nombre,
        email: user.email,
      },
      process.env.USER_JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const cookieStore = await cookies();
    cookieStore.set("user-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    log.info("login_user.ok", { ip: clientIP });

    return NextResponse.json(
      {
        success: true,
        user: {
          nombre: user.nombre,
          email: user.email,
          emailVerificado: user.emailVerificado,
        },
      },
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error en login de usuario:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}