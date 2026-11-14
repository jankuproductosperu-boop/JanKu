import "server-only";
import bcrypt from "bcryptjs";
import { isValidObjectId, type Types } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, entradaInvalida, noEncontrado } from "@/server/http/errors";
import { log } from "@/server/logger";
import AdminUser from "@/models/AdminUser";
import { ROLES } from "@/lib/permissions";
import type { AdminActualizar, AdminCrear } from "@/server/validation/admin-user.schema";
import type { AdminRol, AdminUserPublic } from "@/types";

const COSTE_BCRYPT = 12;
// Nunca password ni tokenVersion.
const CAMPOS_PUBLICOS = "username nombre email rol activo ultimoAcceso createdAt";

type Actor = { adminId: string };

type AdminLean = {
  _id: Types.ObjectId;
  username: string;
  nombre: string;
  email: string;
  rol?: unknown;
  activo?: boolean;
  ultimoAcceso?: Date;
  createdAt?: Date;
};

// Superadmin activo: activo !== false y rol "superadmin" o ausente (D-17).
// Un rol null no se cuenta: así la regla solo puede ser más estricta, nunca más laxa.
const FILTRO_SUPERADMIN_ACTIVO = {
  activo: { $ne: false },
  $or: [{ rol: "superadmin" as const }, { rol: { $exists: false } }],
};

function esRol(x: unknown): x is AdminRol {
  return typeof x === "string" && (ROLES as readonly string[]).includes(x);
}

/** Rol efectivo, igual que en requireAdmin: ausente = superadmin. */
function rolEfectivo(rol: unknown): AdminRol | null {
  if (rol === undefined || rol === null) return "superadmin";
  return esRol(rol) ? rol : null;
}

function esSuperadminActivo(d: AdminLean): boolean {
  return d.activo !== false && rolEfectivo(d.rol) === "superadmin";
}

function aPublico(d: AdminLean): AdminUserPublic {
  return {
    _id: String(d._id),
    username: d.username,
    nombre: d.nombre,
    email: d.email,
    // Un valor no reconocido (el guard le niega el acceso) se muestra con el rol de menos permisos.
    rol: rolEfectivo(d.rol) ?? "ventas",
    activo: d.activo !== false,
    ...(d.ultimoAcceso ? { ultimoAcceso: new Date(d.ultimoAcceso).toISOString() } : {}),
    ...(d.createdAt ? { createdAt: new Date(d.createdAt).toISOString() } : {}),
  };
}

function exacto(valor: string): RegExp {
  return new RegExp(`^${valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

const duplicado = () => conflicto("Ya existe un administrador con ese usuario o correo", "DUPLICADO");

export async function listarAdmins(): Promise<AdminUserPublic[]> {
  await connectDB();
  const docs = await AdminUser.find().select(CAMPOS_PUBLICOS).sort({ createdAt: 1 }).lean<AdminLean[]>();
  return docs.map(aPublico);
}

export async function crearAdmin(datos: AdminCrear, actor: Actor): Promise<AdminUserPublic> {
  await connectDB();

  const existe = await AdminUser.exists({
    $or: [{ username: exacto(datos.username) }, { email: exacto(datos.email) }],
  });
  if (existe) throw duplicado();

  const hash = await bcrypt.hash(datos.password, COSTE_BCRYPT);
  // Si dos altas iguales llegan a la vez, el índice único responde 11000 → 409 DUPLICADO en handle().
  const creado = await AdminUser.create({
    username: datos.username,
    nombre: datos.nombre,
    email: datos.email,
    rol: datos.rol,
    password: hash,
    activo: true,
    tokenVersion: 0,
  });

  const objetivoId = String(creado._id);
  log.info("admin.cambio", {
    actorId: actor.adminId,
    objetivoId,
    accion: "crear",
    campos: ["username", "nombre", "email", "rol", "password"],
  });

  const doc = await AdminUser.findById(creado._id).select(CAMPOS_PUBLICOS).lean<AdminLean>();
  if (!doc) throw noEncontrado("Administrador");
  return aPublico(doc);
}

export async function actualizarAdmin(
  id: string,
  datos: AdminActualizar,
  actor: Actor,
): Promise<AdminUserPublic> {
  if (!isValidObjectId(id)) throw noEncontrado("Administrador");
  await connectDB();

  const actual = await AdminUser.findById(id).select(CAMPOS_PUBLICOS).lean<AdminLean>();
  if (!actual) throw noEncontrado("Administrador");

  const rolAntes = rolEfectivo(actual.rol);
  const activoAntes = actual.activo !== false;
  const cambiaRol = datos.rol !== undefined && datos.rol !== rolAntes;
  const cambiaActivo = datos.activo !== undefined && datos.activo !== activoAntes;

  if (String(actual._id) === actor.adminId && (cambiaRol || cambiaActivo)) {
    throw conflicto("No puedes cambiar tu propio rol ni desactivarte", "NO_AUTOEDICION");
  }

  // Cambiar la contraseña propia exige la actual: una sesión robada no basta para quedarse la cuenta.
  if (String(actual._id) === actor.adminId && datos.password !== undefined) {
    const conHash = await AdminUser.findById(actual._id).select("password").lean<{ password?: string }>();
    const correcta =
      !!datos.passwordActual && !!conHash?.password && (await bcrypt.compare(datos.passwordActual, conHash.password));
    if (!correcta) throw entradaInvalida({ passwordActual: "La contraseña actual no es correcta" });
  }

  const quitaSuperadmin =
    esSuperadminActivo(actual) &&
    ((cambiaRol && datos.rol !== "superadmin") || (cambiaActivo && datos.activo === false));
  const ultimoSuperadmin = () =>
    conflicto("Debe quedar al menos un superadministrador activo", "ULTIMO_SUPERADMIN");

  if (quitaSuperadmin) {
    const otros = await AdminUser.countDocuments({ ...FILTRO_SUPERADMIN_ACTIVO, _id: { $ne: actual._id } });
    if (otros === 0) throw ultimoSuperadmin();
  }

  if (datos.email !== undefined && datos.email !== actual.email.toLowerCase()) {
    const otro = await AdminUser.exists({ _id: { $ne: actual._id }, email: exacto(datos.email) });
    if (otro) throw duplicado();
  }

  const set: Record<string, unknown> = {};
  if (datos.nombre !== undefined) set.nombre = datos.nombre;
  if (datos.email !== undefined) set.email = datos.email;
  if (datos.rol !== undefined) set.rol = datos.rol;
  if (datos.activo !== undefined) set.activo = datos.activo;
  if (datos.password !== undefined) set.password = await bcrypt.hash(datos.password, COSTE_BCRYPT);

  const campos = Object.keys(set);
  if (campos.length === 0) return aPublico(actual);

  // Cambiar contraseña, rol o activo cierra todas las sesiones de ese admin.
  const cierraSesiones = datos.password !== undefined || cambiaRol || cambiaActivo;
  const actualizado = await AdminUser.findByIdAndUpdate(
    actual._id,
    { $set: set, ...(cierraSesiones ? { $inc: { tokenVersion: 1 } } : {}) },
    { new: true, runValidators: true },
  )
    .select(CAMPOS_PUBLICOS)
    .lean<AdminLean>();
  if (!actualizado) throw noEncontrado("Administrador");

  if (quitaSuperadmin) {
    // Dos superadmins degradándose a la vez podrían dejar cero: se comprueba después y se deshace.
    const quedan = await AdminUser.countDocuments(FILTRO_SUPERADMIN_ACTIVO);
    if (quedan === 0) {
      await AdminUser.updateOne(
        { _id: actual._id },
        { $set: { rol: rolAntes ?? "superadmin", activo: activoAntes } },
      );
      log.warn("admin.ultimo_superadmin_revertido", { actorId: actor.adminId, objetivoId: id });
      throw ultimoSuperadmin();
    }
  }

  log.info("admin.cambio", { actorId: actor.adminId, objetivoId: id, accion: "actualizar", campos });
  return aPublico(actualizado);
}
