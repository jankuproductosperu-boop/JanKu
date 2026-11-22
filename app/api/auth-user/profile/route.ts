import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { SECURITY_HEADERS, handle } from "@/server/http/respond";
import { requireUser } from "@/server/auth/guards";
import { borrarCookieUser } from "@/server/auth/session";
import { log } from "@/server/logger";
import { normalizarTelefono } from "@/lib/phone";
import { perfilActualizarCuerpoSchema, perfilEliminarCuerpoSchema } from "@/server/validation/auth.schema";

// requireUser() va fuera del try: su 401 lo responde handle().

// ── GET — ver perfil ──────────────────────────────────────────────────────────
export const GET = handle(async () => {
  const { id: userId } = await requireUser();
  try {
    await connectDB();
    const user = await User.findById(userId).select(
      "nombre email emailVerificado telefono direccion createdAt ultimoAcceso"
    );

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user }, { headers: SECURITY_HEADERS });
  } catch (error) {
    log.error("perfil.get.error", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
});

// ── PUT — editar perfil ───────────────────────────────────────────────────────
export const PUT = handle(async (request: NextRequest) => {
  const { id: userId } = await requireUser();
  try {
    let crudo: unknown;
    try {
      crudo = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    // Fase 26a (D-89): un tipo equivocado se trata igual que un JSON mal formado.
    const cuerpo = perfilActualizarCuerpoSchema.safeParse(crudo);
    if (!cuerpo.success) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }
    const body = cuerpo.data;

    // Solo permitir actualizar nombre, celular y dirección — no email ni password desde aquí
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

    // Celular (fase 20): ausente = no se toca; "" = se borra; si no, debe ser un móvil peruano válido.
    if (body.telefono !== undefined) {
      const entrada = typeof body.telefono === "string" ? body.telefono.trim() : null;
      const normalizado = entrada === "" ? "" : entrada === null || entrada.length > 20 ? null : normalizarTelefono(entrada);
      if (normalizado === null) {
        const mensaje = "Ingresa un celular válido de 9 dígitos";
        return NextResponse.json(
          { error: mensaje, code: "ENTRADA_INVALIDA", fields: { telefono: mensaje } },
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
      updateData.telefono = normalizado;
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
      "nombre email emailVerificado telefono direccion"
    );

    return NextResponse.json({ user: updated }, { headers: SECURITY_HEADERS });
  } catch (error) {
    log.error("perfil.put.error", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
});

// ── DELETE — el usuario elimina su propia cuenta ────────────────────────────
// Requiere confirmar la contraseña actual como medida de seguridad —
// evita borrados accidentales o por terceros con acceso momentáneo a la sesión.
export const DELETE = handle(async (request: NextRequest) => {
  const { id: userId } = await requireUser();
  try {
    let crudo: unknown;
    try {
      crudo = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Fase 26a (D-89): un tipo equivocado se trata igual que un JSON mal formado.
    const cuerpo = perfilEliminarCuerpoSchema.safeParse(crudo);
    if (!cuerpo.success) {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    const body = cuerpo.data;

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

    log.info("perfil.cuenta_eliminada", { id: userId });

    // Limpiar la cookie de sesión — ya no hay cuenta a la que pertenezca
    await borrarCookieUser();

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
    log.error("perfil.delete.error", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
});