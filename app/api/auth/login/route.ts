import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { loginTracker } from "@/lib/loginAttempts";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TuContraseñaSegura123!";

// Función para obtener IP del cliente
function getClientIP(headersList: Headers): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const headersList = await headers();
    const clientIP = getClientIP(headersList);

    // ✅ Verificar si está bloqueado
    const blockStatus = loginTracker.isBlocked(clientIP);
    
    if (blockStatus.blocked) {
      return NextResponse.json(
        { 
          error: `Demasiados intentos fallidos. Bloqueado por ${blockStatus.remainingTime} minutos.`,
          blocked: true,
          remainingTime: blockStatus.remainingTime
        },
        { status: 429 }
      );
    }

    // Verificar contraseña
    if (password === ADMIN_PASSWORD) {
      // ✅ Login exitoso - resetear intentos
      loginTracker.reset(clientIP);

      // Establecer cookie de autenticación
      const cookieStore = await cookies();
      cookieStore.set('admin-auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 horas
        path: '/',
      });

      // ✅ Log de acceso exitoso
      console.log(`✅ Login exitoso desde IP: ${clientIP} - ${new Date().toISOString()}`);

      return NextResponse.json({ success: true });
    } else {
      // ✅ Registrar intento fallido
      loginTracker.recordAttempt(clientIP);
      const remaining = loginTracker.getRemainingAttempts(clientIP);

      // ✅ Log de intento fallido
      console.warn(`❌ Intento fallido desde IP: ${clientIP} - Intentos restantes: ${remaining} - ${new Date().toISOString()}`);

      return NextResponse.json(
        { 
          error: "Contraseña incorrecta",
          remainingAttempts: remaining
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("❌ Error en login:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}