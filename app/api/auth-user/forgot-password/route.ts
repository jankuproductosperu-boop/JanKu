import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import {
  validarEmail,
  generarToken,
  hashearToken,
  SECURITY_HEADERS,
} from "@/lib/authUtils";
import { enviarEmailResetPassword } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    const { email } = body;

    if (!email || !validarEmail(email)) {
      // Mismo mensaje siempre — evita enumeración de emails
      return NextResponse.json(
        { message: "Si ese email existe, recibirás un enlace en tu bandeja." },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    await connectDB();
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      activo: true,
      emailVerificado: true,
    });

    // Responder siempre igual aunque no exista el usuario
    if (!user) {
      return NextResponse.json(
        { message: "Si ese email existe, recibirás un enlace en tu bandeja." },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // Generar token de un solo uso con expiración de 15 minutos
    const token = generarToken();
    const tokenHash = hashearToken(token);

    await User.findByIdAndUpdate(user._id, {
      tokenResetPassword: tokenHash,
      tokenResetPasswordExpira: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      tokenResetPasswordUsado: false,
    });

    await enviarEmailResetPassword(user.email, user.nombre, token);

    console.log(`🔑 Reset de contraseña solicitado: ${user.email}`);

    return NextResponse.json(
      { message: "Si ese email existe, recibirás un enlace en tu bandeja." },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error en forgot-password:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}