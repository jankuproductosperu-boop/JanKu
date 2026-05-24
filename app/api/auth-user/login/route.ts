import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import UserLoginBlock from "@/models/UserLoginBlock";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import {
  validarEmail,
  userRateLimiter,
  SECURITY_HEADERS,
  obtenerIP,
} from "@/lib/authUtils";

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const clientIP = obtenerIP(headersList);

    // ── 1. Rate limiting doble capa (memoria + MongoDB) ───────────────────
    let bloqueo = userRateLimiter.estaBloqueado(clientIP);

    if (!bloqueo.bloqueado) {
      await connectDB();
      const dbBlock = await UserLoginBlock.findOne({ ip: clientIP });
      if (dbBlock?.blockedUntil && Date.now() < dbBlock.blockedUntil) {
        const tiempoRestante = Math.ceil((dbBlock.blockedUntil - Date.now()) / 1000 / 60);
        bloqueo = { bloqueado: true, tiempoRestante };
      }
    }

    if (bloqueo.bloqueado) {
      return NextResponse.json(
        {
          error: `Demasiados intentos. Bloqueado por ${bloqueo.tiempoRestante} minutos.`,
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

    if (!validarEmail(email) || password.length > 200) {
      userRateLimiter.registrarIntento(clientIP);
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 3. Buscar usuario ─────────────────────────────────────────────────
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim(), activo: true });

    // Función para registrar intento fallido (memoria + MongoDB)
    const registrarFallo = async () => {
      userRateLimiter.registrarIntento(clientIP);
      await UserLoginBlock.findOneAndUpdate(
        { ip: clientIP },
        {
          $inc: { count: 1 },
          $set: {
            lastAttempt: Date.now(),
            blockedUntil: userRateLimiter.estaBloqueado(clientIP).bloqueado
              ? Date.now() + 15 * 60 * 1000
              : null,
          },
        },
        { upsert: true }
      );
    };

    // Mismo mensaje si no existe el usuario o la contraseña es incorrecta
    // — evita enumeración de usuarios
    if (!user) {
      await registrarFallo();
      const restantes = userRateLimiter.intentosRestantes(clientIP);
      return NextResponse.json(
        { error: "Credenciales incorrectas", intentosRestantes: restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 4. Verificar contraseña ───────────────────────────────────────────
    const passwordValida = await bcrypt.compare(password, user.password);
    if (!passwordValida) {
      await registrarFallo();
      const restantes = userRateLimiter.intentosRestantes(clientIP);
      return NextResponse.json(
        { error: "Credenciales incorrectas", intentosRestantes: restantes },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // ── 5. Verificar que el email esté confirmado ─────────────────────────
    if (!user.emailVerificado) {
      return NextResponse.json(
        { error: "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja." },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // ── 6. Login exitoso ──────────────────────────────────────────────────
    userRateLimiter.resetear(clientIP);
    await UserLoginBlock.deleteOne({ ip: clientIP });
    await User.findByIdAndUpdate(user._id, { ultimoAcceso: new Date() });

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

    console.log(`✅ Login usuario: ${user.email} desde IP: ${clientIP}`);

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