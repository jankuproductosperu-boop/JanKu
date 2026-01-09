import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { loginTracker } from "@/lib/loginAttempts";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getClientIP(headersList: Headers): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const headersList = await headers();
    const clientIP = getClientIP(headersList);

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

    await connectDB();

    const user = await AdminUser.findOne({ username, activo: true });

    if (!user) {
      loginTracker.recordAttempt(clientIP);
      const remaining = loginTracker.getRemainingAttempts(clientIP);
      console.warn(`❌ Usuario no encontrado: ${username} desde IP: ${clientIP}`);
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos", remainingAttempts: remaining },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      loginTracker.recordAttempt(clientIP);
      const remaining = loginTracker.getRemainingAttempts(clientIP);
      console.warn(`❌ Contraseña incorrecta para ${username} desde IP: ${clientIP}`);
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos", remainingAttempts: remaining },
        { status: 401 }
      );
    }

    loginTracker.reset(clientIP);

    await AdminUser.findByIdAndUpdate(user._id, { ultimoAcceso: new Date() });

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    const cookieStore = await cookies();
    cookieStore.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    console.log(`✅ Login exitoso: ${user.username} desde IP: ${clientIP}`);
    return NextResponse.json({ success: true, username: user.username });

  } catch (error) {
    console.error("❌ Error en login:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}