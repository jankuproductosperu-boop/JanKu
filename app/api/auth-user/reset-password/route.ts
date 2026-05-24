import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import {
  validarPassword,
  hashearToken,
  SECURITY_HEADERS,
} from "@/lib/authUtils";

export async function POST(request: NextRequest) {
  try {
    let body: { token?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    const { token, password } = body;

    if (!token || token.length > 200) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const passwordValidacion = validarPassword(password || "");
    if (!passwordValidacion.valida) {
      return NextResponse.json(
        { error: passwordValidacion.mensaje },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const tokenHash = hashearToken(token);

    await connectDB();
    const user = await User.findOne({
      tokenResetPassword: tokenHash,
      tokenResetPasswordUsado: false,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido o ya utilizado" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Verificar que no expiró (15 minutos)
    if (user.tokenResetPasswordExpira && user.tokenResetPasswordExpira < new Date()) {
      return NextResponse.json(
        { error: "El enlace expiró. Solicita uno nuevo." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(password!, 12);

    // Actualizar contraseña y marcar token como usado
    await User.findByIdAndUpdate(user._id, {
      password: passwordHash,
      tokenResetPassword: null,
      tokenResetPasswordExpira: null,
      tokenResetPasswordUsado: true,
      // Resetear intentos fallidos de login
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });

    console.log(`✅ Contraseña restablecida: ${user.email}`);

    return NextResponse.json(
      { message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error en reset-password:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}