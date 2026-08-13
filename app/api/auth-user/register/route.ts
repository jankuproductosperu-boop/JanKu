import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import {
  validarEmail,
  validarPassword,
  validarNombre,
  generarToken,
  hashearToken,
  registerRateLimiter,
  resendVerificationLimiter,
  SECURITY_HEADERS,
  obtenerIP,
} from "@/lib/authUtils";
import { enviarEmailVerificacion } from "@/lib/email";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const clientIP = obtenerIP(headersList);

    // ── 1. Rate limiting para registro — máx 3 cuentas por IP por hora ───
    if (!registerRateLimiter.puedeRegistrar(clientIP)) {
      return NextResponse.json(
        { error: "Demasiados registros desde esta IP. Intenta en 1 hora." },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    // ── 2. Parsear body ───────────────────────────────────────────────────
    let body: { nombre?: string; email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { nombre, email, password } = body;

    // ── 3. Validaciones ───────────────────────────────────────────────────
    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!validarNombre(nombre)) {
      return NextResponse.json(
        { error: "El nombre debe tener entre 2 y 100 caracteres" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!validarEmail(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const passwordValidacion = validarPassword(password);
    if (!passwordValidacion.valida) {
      return NextResponse.json(
        { error: passwordValidacion.mensaje },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const emailNormalizado = email.toLowerCase().trim();

    // ── 4. Verificar si el email ya existe ────────────────────────────────
    await connectDB();
    const usuarioExistente = await User.findOne({ email: emailNormalizado });

    // IMPORTANTE: mismo mensaje si existe o no — evita enumeración de usuarios
    if (usuarioExistente) {
      // Si ya existe pero no verificó el email, reenviar verificación
      if (!usuarioExistente.emailVerificado) {
        // ── Límite de reenvío por EMAIL — evita "email bombing" a una víctima ──
        const { permitido, tiempoRestante } = resendVerificationLimiter.puedeReenviar(emailNormalizado);

        if (!permitido) {
          // Respondemos igual que siempre para no revelar que el límite se activó
          // por este email específico (evita enumeración), pero no reenviamos nada.
          console.warn(`⚠️ Límite de reenvío alcanzado para: ${emailNormalizado} (${tiempoRestante} min restantes)`);
          return NextResponse.json(
            { message: "Te enviamos un email de verificación. Revisa tu bandeja." },
            { status: 200, headers: SECURITY_HEADERS }
          );
        }

        const token = generarToken();
        const tokenHash = hashearToken(token);
        await User.findByIdAndUpdate(usuarioExistente._id, {
          tokenVerificacion: tokenHash,
          tokenVerificacionExpira: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await enviarEmailVerificacion(email, usuarioExistente.nombre, token);
        return NextResponse.json(
          { message: "Te enviamos un email de verificación. Revisa tu bandeja." },
          { status: 200, headers: SECURITY_HEADERS }
        );
      }
      // Si ya existe y está verificado, mismo mensaje genérico
      return NextResponse.json(
        { message: "Te enviamos un email de verificación. Revisa tu bandeja." },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // ── 5. Hashear contraseña ─────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── 6. Generar token de verificación ──────────────────────────────────
    const token = generarToken();
    const tokenHash = hashearToken(token);

    // ── 7. Crear usuario ──────────────────────────────────────────────────
    await User.create({
      nombre: nombre.trim(),
      email: emailNormalizado,
      password: passwordHash,
      tokenVerificacion: tokenHash,
      tokenVerificacionExpira: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    // ── 8. Enviar email de verificación ───────────────────────────────────
    await enviarEmailVerificacion(email, nombre.trim(), token);

    console.log(`✅ Nuevo usuario registrado desde IP: ${clientIP}`);

    return NextResponse.json(
      { message: "Te enviamos un email de verificación. Revisa tu bandeja." },
      { status: 201, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error en registro:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}