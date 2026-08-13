import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
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

    await connectDB();

    if (body.direccion) {
      // Merge con la dirección existente en vez de sobrescribirla completa
      const usuarioActual = await User.findById(userId).select("direccion");
      const direccionActual = usuarioActual?.direccion || {};

      updateData.direccion = {
        calle: (body.direccion.calle ?? direccionActual.calle ?? "").slice(0, 200),
        ciudad: (body.direccion.ciudad ?? direccionActual.ciudad ?? "").slice(0, 100),
        departamento: (body.direccion.departamento ?? direccionActual.departamento ?? "").slice(0, 100),
        codigoPostal: (body.direccion.codigoPostal ?? direccionActual.codigoPostal ?? "").slice(0, 20),
      };
    }

    const updated = await User.findByIdAndUpdate(userId, updateData, { new: true }).select(
      "nombre email emailVerificado direccion"
    );

    return NextResponse.json({ user: updated }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("❌ Error en PUT perfil:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// ── DELETE — el usuario elimina su propia cuenta ────────────────────────────
// Requiere confirmar la contraseña actual como medida de seguridad —
// evita borrados accidentales o por terceros con acceso momentáneo a la sesión.
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!body.password) {
      return NextResponse.json(
        { error: "Debes ingresar tu contraseña para confirmar" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const passwordValida = await bcrypt.compare(body.password, user.password);
    if (!passwordValida) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    await User.findByIdAndDelete(userId);

    console.log(`🗑️ Cuenta eliminada por el propio usuario: ${user.email}`);

    // Limpiar la cookie de sesión — ya no hay cuenta a la que pertenezca
    const cookieStore = await cookies();
    cookieStore.delete("user-token");

    return NextResponse.json(
      { success: true, message: "Tu cuenta fue eliminada correctamente." },
      {
        headers: {
          ...SECURITY_HEADERS,
          "Clear-Site-Data": '"cookies"',
        },
      }
    );
  } catch (error) {
    console.error("❌ Error eliminando cuenta:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}