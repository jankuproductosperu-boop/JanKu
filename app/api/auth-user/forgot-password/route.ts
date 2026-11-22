import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/models/User";
import { validarEmail } from "@/server/auth/validators";
import { generarToken, hashearToken } from "@/server/auth/tokens";
import { SECURITY_HEADERS } from "@/server/http/respond";
import { enviarEmailResetPassword } from "@/server/email/auth-emails";
import { obtenerIP } from "@/server/auth/ip";
import { registrarIntento } from "@/server/auth/rateLimit";
import { log } from "@/server/logger";
import { headers } from "next/headers";
import { recuperarCuerpoSchema } from "@/server/validation/auth.schema";

export async function POST(request: NextRequest) {
  try {
    let crudo: unknown;
    try {
      crudo = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    // Fase 26a (D-89): un tipo equivocado se trata igual que un JSON mal formado.
    const cuerpo = recuperarCuerpoSchema.safeParse(crudo);
    if (!cuerpo.success) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }
    const body = cuerpo.data;

    const { email } = body;

    if (!email || !validarEmail(email)) {
      // Mismo mensaje siempre — evita enumeración de emails
      return NextResponse.json(
        { message: "Si ese email existe, recibirás un enlace en tu bandeja." },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    const emailNormalizado = email.toLowerCase().trim();
    const clientIP = obtenerIP(await headers());

    // ── Límite por IP y por email — evita email bombing a una víctima ─────
    // Si se supera, misma respuesta genérica y sin enviar ni tocar usuarios.
    const porIP = await registrarIntento("forgot", "ip", clientIP);
    const porEmail = await registrarIntento("forgot", "email", emailNormalizado);
    if (!porIP.permitido || !porEmail.permitido) {
      log.warn("forgot.limite", { ip: clientIP });
      return NextResponse.json(
        { message: "Si ese email existe, recibirás un enlace en tu bandeja." },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    await connectDB();
    const user = await User.findOne({
      email: emailNormalizado,
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

    log.info("forgot.enviado", { ip: clientIP });

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