import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/server/db";
import AdminUser from "@/models/AdminUser";
import User from "@/models/User";
import { COOKIE_ADMIN, COOKIE_USER, leerCookie, verificarAdmin, verificarUser } from "@/server/auth/session";
import { noAutorizado, prohibido } from "@/server/http/errors";
import { log } from "@/server/logger";
import { ROLES, permisosDe, tienePermiso } from "@/lib/permissions";
import type { AdminRol, AdminSession, Permiso, SessionUser } from "@/types";

type AdminDoc = {
  _id: unknown;
  username: string;
  nombre: string;
  activo?: boolean;
  tokenVersion?: number;
  rol?: unknown; // el campo llega en la fase 09
};

type UserDoc = {
  _id: unknown;
  nombre: string;
  email: string;
  emailVerificado?: boolean;
  activo?: boolean;
  tokenVersion?: number;
};

function esRol(x: unknown): x is AdminRol {
  return typeof x === "string" && (ROLES as readonly string[]).includes(x);
}

/** Lanza noAutorizado() si no hay sesión válida; prohibido() si falta el permiso. */
export async function requireAdmin(permiso?: Permiso): Promise<AdminSession> {
  const token = await leerCookie(COOKIE_ADMIN);
  if (!token) throw noAutorizado();

  const claims = await verificarAdmin(token);
  if (!claims || !isValidObjectId(claims.id)) throw noAutorizado();

  await connectDB();
  const doc = await AdminUser.findById(claims.id)
    .select("username nombre rol activo tokenVersion")
    .lean<AdminDoc>();

  if (!doc || doc.activo === false || (doc.tokenVersion ?? 0) !== claims.tv) throw noAutorizado();

  let rol: AdminRol;
  if (doc.rol === undefined || doc.rol === null) {
    rol = "superadmin"; // D-17: sin rol equivale al acceso actual
    log.warn("admin.sin_rol", { id: claims.id });
  } else if (esRol(doc.rol)) {
    rol = doc.rol;
  } else {
    // Valor que no es ninguno de los tres roles: se niega el acceso (falla cerrado).
    log.warn("admin.rol_invalido", { id: claims.id });
    throw noAutorizado();
  }

  if (permiso && !tienePermiso(rol, permiso)) throw prohibido();

  return { id: claims.id, username: doc.username, nombre: doc.nombre, rol, permisos: permisosDe(rol) };
}

/**
 * Un producto lleva campos de otros permisos (D-17): la cantidad es inventario y el costo/proveedor
 * son costos. Si el cuerpo los trae, la sesión debe tener también ese permiso. Lanza prohibido().
 */
export function exigirPermisosDeCampos(
  admin: AdminSession,
  datos: { stockCantidad?: unknown; variantes?: unknown; precioCosto?: unknown; proveedor?: unknown },
): void {
  // Las variantes llevan stock propio: tocarlas también es inventario (fase 13b).
  const tocaStock = datos.stockCantidad !== undefined || datos.variantes !== undefined;
  if (tocaStock && !admin.permisos.includes("inventario.editar")) throw prohibido();
  if ((datos.precioCosto !== undefined || datos.proveedor !== undefined) && !admin.permisos.includes("costos.ver")) {
    throw prohibido();
  }
}

async function cargarUsuario(): Promise<SessionUser | null> {
  const token = await leerCookie(COOKIE_USER);
  if (!token) return null;

  const claims = await verificarUser(token);
  if (!claims || !isValidObjectId(claims.id)) return null;

  await connectDB();
  const doc = await User.findById(claims.id)
    .select("nombre email emailVerificado activo tokenVersion")
    .lean<UserDoc>();

  if (!doc || doc.activo === false || (doc.tokenVersion ?? 0) !== claims.tv) return null;

  return { id: claims.id, nombre: doc.nombre, email: doc.email, emailVerificado: doc.emailVerificado ?? false };
}

/** Lanza noAutorizado(). */
export async function requireUser(): Promise<SessionUser> {
  const usuario = await cargarUsuario();
  if (!usuario) throw noAutorizado();
  return usuario;
}

/** Nunca lanza. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  try {
    return await cargarUsuario();
  } catch (err) {
    log.error("sesion_usuario.error", err);
    return null;
  }
}
