import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashearToken, SECURITY_HEADERS } from "@/lib/authUtils";
import { enviarEmailBienvenida } from "@/lib/email";

// ── GET: solo COMPRUEBA que el token es válido, NO verifica la cuenta ───────
// Esto evita que escáneres de seguridad de email (Outlook Safe Links, Gmail,
// antivirus corporativos) "pre-visiten" el link automáticamente y verifiquen
// la cuenta o quemen el token sin que el usuario haga clic realmente.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length > 200) {
      return NextResponse.json(
        { valido: false, error: "Token inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const tokenHash = hashearToken(token);
    await connectDB();

    const user = await User.findOne({
      tokenVerificacion: tokenHash,
      emailVerificado: false,
    });

    if (!user) {
      return NextResponse.json(
        { valido: false, error: "Token inválido o ya utilizado" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (user.tokenVerificacionExpira && user.tokenVerificacionExpira < new Date()) {
      return NextResponse.json(
        { valido: false, error: "El enlace expiró. Regístrate de nuevo para recibir uno nuevo." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Token válido — pero NO marcamos nada todavía
    return NextResponse.json(
      { valido: true, nombre: user.nombre },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("❌ Error comprobando token de verificación:", error);
    return NextResponse.json(
      { valido: false, error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

// ── POST: aquí SÍ se verifica la cuenta — requiere acción explícita del usuario
export async function POST(request: NextRequest) {
  try {
    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { token } = body;

    if (!token || token.length > 200) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

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