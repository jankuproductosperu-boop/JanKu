import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SECURITY_HEADERS } from "@/lib/authUtils";

async function getUserIdFromToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("user-token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.USER_JWT_SECRET!)
    );
    return payload.userId as string;
  } catch {
    return null;
  }
}

// ── GET — ver perfil ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId).select(
      "nombre email emailVerificado direccion createdAt ultimoAcceso"
    );

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("❌ Error en GET perfil:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// ── PUT — editar perfil ───────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body: {
      nombre?: string;
      direccion?: {
        calle?: string;
        ciudad?: string;
        departamento?: string;
        codigoPostal?: string;
      };
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    // Solo permitir actualizar nombre y dirección — no email ni password desde aquí
    const updateData: Record<string, unknown> = {};

    if (body.nombre) {
      if (body.nombre.trim().length < 2 || body.nombre.trim().length > 100) {
        return NextResponse.json(
          { error: "El nombre debe tener entre 2 y 100 caracteres" },
          { status: 400 }
        );
      }
      updateData.nombre = body.nombre.trim();
    }

    if (body.direccion) {
      updateData.direccion = {
        calle: (body.direccion.calle || "").slice(0, 200),
        ciudad: (body.direccion.ciudad || "").slice(0, 100),
        departamento: (body.direccion.departamento || "").slice(0, 100),
        codigoPostal: (body.direccion.codigoPostal || "").slice(0, 20),
      };
    }

    await connectDB();
    const updated = await User.findByIdAndUpdate(userId, updateData, { new: true }).select(
      "nombre email emailVerificado direccion"
    );

    return NextResponse.json({ user: updated }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("❌ Error en PUT perfil:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}