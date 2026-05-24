import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashearToken, SECURITY_HEADERS } from "@/lib/authUtils";
import { enviarEmailBienvenida } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length > 200) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Hashear el token para comparar con el guardado en BD
    const tokenHash = hashearToken(token);

    await connectDB();

    const user = await User.findOne({
      tokenVerificacion: tokenHash,
      emailVerificado: false,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token inválido o ya utilizado" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Verificar que no haya expirado
    if (user.tokenVerificacionExpira && user.tokenVerificacionExpira < new Date()) {
      return NextResponse.json(
        { error: "El enlace expiró. Regístrate de nuevo para recibir uno nuevo." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Marcar como verificado y limpiar token
    await User.findByIdAndUpdate(user._id, {
      emailVerificado: true,
      tokenVerificacion: null,
      tokenVerificacionExpira: null,
    });

    // Enviar email de bienvenida
    try {
      await enviarEmailBienvenida(user.email, user.nombre);
    } catch {
      // No bloquear si falla el email de bienvenida
      console.error("Error enviando email de bienvenida");
    }

    console.log(`✅ Email verificado: ${user.email}`);

    return NextResponse.json(
      { message: "Email verificado correctamente. Ya puedes iniciar sesión." },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error verificando email:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}