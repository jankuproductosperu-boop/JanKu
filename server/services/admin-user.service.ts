import "server-only";
import bcrypt from "bcryptjs";
import { isValidObjectId, type Types } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, demasiadosIntentos, entradaInvalida, noAutorizado, noEncontrado } from "@/server/http/errors";
import { log } from "@/server/logger";
import AdminUser from "@/models/AdminUser";
import { ROLES } from "@/lib/permissions";
import { normalizarCodigoRescate, normalizarCodigoTotp, uriOtpauth } from "@/lib/totp";
import {
  cifrarSecreto,
  claveConfigurada,
  descifrarSecreto,
  generarCodigosRescate,
  generarSecreto,
  hashCodigoRescate,
  hmacIp,
  verificarTotp,
} from "@/server/auth/totp";
import { consultar, registrarIntento, reiniciar } from "@/server/auth/rateLimit";
import { enviarAvisoAccesoNuevo } from "@/server/email/auth-emails";
import type { AdminActualizar, AdminCrear } from "@/server/validation/admin-user.schema";
import type { AdminRol, AdminUserPublic, SeguridadEstado, SeguridadInicio } from "@/types";

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

// ══ Fase 26b: verificación en dos pasos y aviso de acceso nuevo ═════════════════

export const EMISOR_TOTP = "Janku Panel";
const MINUTOS_PENDIENTE = 10; // para escanear el QR y escribir el primer código
const MAX_IPS_CONOCIDAS = 20;

type DocSeguridad = {
  _id: Types.ObjectId;
  username: string;
  nombre: string;
  email: string;
  password: string;
  rol?: unknown;
  activo?: boolean;
  tokenVersion?: number;
  totp?: {
    secretoCifrado?: string;
    activo?: boolean;
    activadoEn?: Date;
    ultimoPaso?: number;
    secretoPendienteCifrado?: string;
    pendienteEn?: Date;
  };
  codigosRescate?: string[];
};

/** Lo que la ruta necesita para firmar la cookie de sesión nueva (tras subir tokenVersion). */
export type SesionAdminFirmable = { id: string; username: string; email: string; tokenVersion: number };

const CAMPOS_SEGURIDAD = "username nombre email password rol activo tokenVersion totp codigosRescate";

/** Q1 (fase 26b): obligatoria para el superadmin (también el que no tiene rol, D-17). */
export function totpObligatoria(rol: unknown): boolean {
  return rolEfectivo(rol) === "superadmin";
}

/** ¿La cuenta pide código tras la contraseña? Exige el secreto guardado, no solo la marca. */
export function totpActiva(d: { totp?: { activo?: boolean; secretoCifrado?: string } | null }): boolean {
  return d.totp?.activo === true && !!d.totp.secretoCifrado;
}

async function cargarSeguridad(adminId: string): Promise<DocSeguridad> {
  if (!isValidObjectId(adminId)) throw noAutorizado();
  await connectDB();
  const doc = await AdminUser.findById(adminId).select(CAMPOS_SEGURIDAD).lean<DocSeguridad>();
  if (!doc || doc.activo === false) throw noAutorizado();
  return doc;
}

const firmable = (d: DocSeguridad, tokenVersion: number): SesionAdminFirmable => ({
  id: String(d._id),
  username: d.username,
  email: d.email,
  tokenVersion,
});

const noDisponible = () =>
  conflicto(
    "La verificación en dos pasos no está disponible: falta configurar el servidor (TOTP_ENC_KEY).",
    "2FA_NO_DISPONIBLE",
  );

/**
 * Cambios en /admin/seguridad: cuenta el intento ANTES de comprobar (como el login, D-18) y lo
 * borra si todo fue correcto. 5 fallos en 15 min bloquean la cuenta 15 min. Un fallo responde
 * siempre lo mismo, sin decir si falló la contraseña o el código.
 */
async function conIntentos<T>(adminId: string, comprobar: () => Promise<T | null>): Promise<T> {
  const estado = await consultar("seguridad", "user", adminId);
  if (estado.bloqueado) throw demasiadosIntentos(estado.minutosRestantes);
  const intento = await registrarIntento("seguridad", "user", adminId);
  if (!intento.dentroDelLimite) throw demasiadosIntentos(intento.minutosRestantes);
  const resultado = await comprobar();
  if (resultado === null) {
    log.warn("admin.seguridad_fallo", { adminId, restantes: intento.restantes });
    throw entradaInvalida(undefined, "La contraseña o el código no son correctos");
  }
  await reiniciar("seguridad", "user", adminId);
  return resultado;
}

/**
 * Consume un código: 6 dígitos de la app (de un paso posterior al último aceptado) o un código de
 * rescate sin usar. Las escrituras son condicionales y atómicas: dos peticiones simultáneas con el
 * mismo código no pasan las dos.
 */
async function consumirCodigo(
  doc: DocSeguridad,
  texto: string,
): Promise<{ metodo: "app" | "rescate"; restantes: number } | null> {
  const secretoCifrado = doc.totp?.secretoCifrado;
  if (!totpActiva(doc) || !secretoCifrado) return null;
  const restantesAntes = doc.codigosRescate?.length ?? 0;

  const totp = normalizarCodigoTotp(texto);
  if (totp) {
    const secreto = descifrarSecreto(secretoCifrado, String(doc._id));
    const paso = verificarTotp(secreto, totp, doc.totp?.ultimoPaso);
    if (paso === null) return null;
    const r = await AdminUser.updateOne(
      {
        _id: doc._id,
        "totp.activo": true,
        $or: [{ "totp.ultimoPaso": { $lt: paso } }, { "totp.ultimoPaso": { $exists: false } }],
      },
      { $set: { "totp.ultimoPaso": paso } },
    );
    return r.modifiedCount === 1 ? { metodo: "app", restantes: restantesAntes } : null;
  }

  const rescate = normalizarCodigoRescate(texto);
  if (rescate) {
    const hash = hashCodigoRescate(rescate);
    const r = await AdminUser.updateOne(
      { _id: doc._id, "totp.activo": true, codigosRescate: hash },
      { $pull: { codigosRescate: hash } },
    );
    if (r.modifiedCount !== 1) return null;
    log.warn("admin.codigo_rescate_usado", { adminId: String(doc._id), restantes: restantesAntes - 1 });
    return { metodo: "rescate", restantes: restantesAntes - 1 };
  }
  return null;
}

export async function estadoSeguridad(adminId: string): Promise<SeguridadEstado> {
  const doc = await cargarSeguridad(adminId);
  const activo = totpActiva(doc);
  return {
    activo,
    ...(activo && doc.totp?.activadoEn ? { activadoEn: new Date(doc.totp.activadoEn).toISOString() } : {}),
    codigosRestantes: activo ? (doc.codigosRescate?.length ?? 0) : 0,
    obligatoria: totpObligatoria(doc.rol),
    disponible: claveConfigurada(),
  };
}

/** Paso 1 de la activación: pide la contraseña y genera un secreto pendiente (10 minutos). */
export async function iniciarActivacion2fa(adminId: string, password: string): Promise<SeguridadInicio> {
  const doc = await cargarSeguridad(adminId);
  if (totpActiva(doc)) throw conflicto("La verificación en dos pasos ya está activa", "2FA_ACTIVA");
  if (!claveConfigurada()) throw noDisponible();

  await conIntentos(adminId, async () => ((await bcrypt.compare(password, doc.password)) ? true : null));

  const { bytes, base32 } = generarSecreto();
  await AdminUser.updateOne(
    { _id: doc._id },
    {
      $set: {
        "totp.secretoPendienteCifrado": cifrarSecreto(bytes, adminId),
        "totp.pendienteEn": new Date(),
      },
    },
  );
  log.info("admin.2fa_inicio", { adminId });
  return { secreto: base32, uri: uriOtpauth({ emisor: EMISOR_TOTP, cuenta: doc.username, secreto: base32 }) };
}

/**
 * Paso 2: el primer código de la app confirma que quedó bien configurada. Activa la 2FA, crea los
 * 8 códigos de rescate (se devuelven solo esta vez) y sube tokenVersion: se cierran las demás sesiones.
 */
export async function confirmarActivacion2fa(
  adminId: string,
  codigo: string,
): Promise<{ codigosRescate: string[]; sesion: SesionAdminFirmable }> {
  const doc = await cargarSeguridad(adminId);
  if (totpActiva(doc)) throw conflicto("La verificación en dos pasos ya está activa", "2FA_ACTIVA");
  const pendiente = doc.totp?.secretoPendienteCifrado;
  const inicio = doc.totp?.pendienteEn ? new Date(doc.totp.pendienteEn).getTime() : 0;
  if (!pendiente || Date.now() - inicio > MINUTOS_PENDIENTE * 60_000) {
    throw conflicto("La activación venció. Vuelve a empezar.", "2FA_PENDIENTE_VENCIDA");
  }

  const paso = await conIntentos(adminId, async () => {
    const t = normalizarCodigoTotp(codigo);
    return t ? verificarTotp(descifrarSecreto(pendiente, adminId), t, undefined) : null;
  });

  const { codigos, hashes } = generarCodigosRescate();
  // Condicional: si otra pestaña ya la activó o empezó otra activación, esta no pisa nada.
  const r = await AdminUser.updateOne(
    { _id: doc._id, "totp.activo": { $ne: true }, "totp.secretoPendienteCifrado": pendiente },
    {
      $set: {
        totp: { secretoCifrado: pendiente, activo: true, activadoEn: new Date(), ultimoPaso: paso },
        codigosRescate: hashes,
      },
      $inc: { tokenVersion: 1 },
    },
  );
  if (r.modifiedCount !== 1) {
    throw conflicto("La activación cambió en otra pestaña. Vuelve a empezar.", "2FA_PENDIENTE_VENCIDA");
  }

  log.info("admin.cambio", { actorId: adminId, objetivoId: adminId, accion: "2fa_activar", campos: ["totp", "codigosRescate"] });
  return { codigosRescate: codigos, sesion: firmable(doc, (doc.tokenVersion ?? 0) + 1) };
}

async function comprobarPasswordYCodigo(doc: DocSeguridad, password: string, codigo: string): Promise<void> {
  if (!totpActiva(doc)) throw conflicto("La verificación en dos pasos no está activa", "2FA_INACTIVA");
  await conIntentos(String(doc._id), async () => {
    // Primero la contraseña: un código de rescate no se gasta si la contraseña es incorrecta.
    if (!(await bcrypt.compare(password, doc.password))) return null;
    return consumirCodigo(doc, codigo);
  });
}

/**
 * Desactiva con contraseña y código (de la app o de rescate). Sube tokenVersion. No se borran los
 * campos (N1-3): queda `totp: { activo: false }` y la lista de códigos vacía.
 */
export async function desactivar2fa(adminId: string, password: string, codigo: string): Promise<SesionAdminFirmable> {
  const doc = await cargarSeguridad(adminId);
  await comprobarPasswordYCodigo(doc, password, codigo);
  await AdminUser.updateOne(
    { _id: doc._id },
    { $set: { totp: { activo: false }, codigosRescate: [] }, $inc: { tokenVersion: 1 } },
  );
  log.info("admin.cambio", { actorId: adminId, objetivoId: adminId, accion: "2fa_desactivar", campos: ["totp", "codigosRescate"] });
  return firmable(doc, (doc.tokenVersion ?? 0) + 1);
}

/** 8 códigos nuevos; los anteriores dejan de valer. No cierra sesiones. */
export async function regenerarCodigosRescate(adminId: string, password: string, codigo: string): Promise<string[]> {
  const doc = await cargarSeguridad(adminId);
  await comprobarPasswordYCodigo(doc, password, codigo);
  const { codigos, hashes } = generarCodigosRescate();
  await AdminUser.updateOne({ _id: doc._id, "totp.activo": true }, { $set: { codigosRescate: hashes } });
  log.info("admin.cambio", { actorId: adminId, objetivoId: adminId, accion: "2fa_regenerar_codigos", campos: ["codigosRescate"] });
  return codigos;
}

/**
 * Segundo paso del login. null ante cualquier fallo (código, cuenta inactiva, sesiones cerradas
 * entretanto, 2FA desactivada): la ruta responde siempre el mismo mensaje.
 */
export async function verificarSegundoPaso(
  pendiente: { id: string; tv: number },
  codigo: string,
): Promise<{ sesion: SesionAdminFirmable; metodo: "app" | "rescate"; restantes: number } | null> {
  if (!isValidObjectId(pendiente.id)) return null;
  await connectDB();
  const doc = await AdminUser.findById(pendiente.id).select(CAMPOS_SEGURIDAD).lean<DocSeguridad>();
  if (!doc || doc.activo === false || (doc.tokenVersion ?? 0) !== pendiente.tv) return null;
  const r = await consumirCodigo(doc, codigo);
  if (!r) return null;
  return { sesion: firmable(doc, doc.tokenVersion ?? 0), ...r };
}

/**
 * Tras un inicio de sesión completo: guarda ultimoAcceso y, si la IP es nueva para esta cuenta,
 * avisa por correo al administrador (y a los superadmin si es gestor o ventas, Q3). Los correos no
 * se esperan. Si falta TOTP_ENC_KEY se omite el aviso, pero el acceso no falla por eso.
 */
export async function registrarAccesoAdmin(adminId: string, ip: string): Promise<void> {
  if (!isValidObjectId(adminId)) return;
  await connectDB();
  await AdminUser.updateOne({ _id: adminId }, { $set: { ultimoAcceso: new Date() } });

  let huella: string;
  try {
    huella = hmacIp(ip);
  } catch {
    log.warn("admin.aviso_acceso_sin_clave", { adminId });
    return;
  }

  // Condicional y atómico: solo una petición registra la IP como nueva. Se guardan las últimas 20.
  const r = await AdminUser.updateOne(
    { _id: adminId, ipsConocidas: { $ne: huella } },
    { $push: { ipsConocidas: { $each: [huella], $slice: -MAX_IPS_CONOCIDAS } } },
  );
  if (r.modifiedCount !== 1) return;

  const doc = await AdminUser.findById(adminId).select("username nombre email rol").lean<AdminLean>();
  if (!doc) return;
  const rol = rolEfectivo(doc.rol) ?? "ventas";
  const base = { nombre: doc.nombre, username: doc.username, rol, ip, fecha: new Date() };
  const enviar = (email: string, esPropio: boolean) => {
    void enviarAvisoAccesoNuevo(email, { ...base, esPropio }).catch((err: unknown) =>
      log.error("admin.aviso_acceso_fallo", err, { adminId }),
    );
  };

  enviar(doc.email, true);
  if (rol !== "superadmin") {
    const supers = await AdminUser.find(FILTRO_SUPERADMIN_ACTIVO).select("email").lean<{ email: string }[]>();
    const propio = doc.email.toLowerCase();
    for (const email of new Set(supers.map((x) => x.email.toLowerCase()))) if (email !== propio) enviar(email, false);
  }
  log.info("admin.acceso_ip_nueva", { adminId });
}
