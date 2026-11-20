import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, noEncontrado } from "@/server/http/errors";
import { log } from "@/server/logger";
import { enviarAvisoReclamo, enviarCopiaReclamo, enviarRespuestaReclamo } from "@/server/email/complaint-emails";
import { sumarDiasHabiles } from "@/lib/diasHabiles";
import { redondear2 } from "@/lib/money";
import { normalizarTelefono } from "@/lib/phone";
import { LEGAL } from "@/lib/siteConfig";
import Complaint from "@/models/Complaint";
import Counter from "@/models/Counter";
import type {
  Complaint as Hoja,
  ComplaintCreateInput,
  ComplaintEstado,
  ComplaintPublic,
  Paginated,
} from "@/types";

// Libro de Reclamaciones (fase 22b, D-79 a D-82).
// Logs: solo `codigo` y `tipo` (N1-2). Nunca DNI, domicilio, correo, teléfono ni el texto de la hoja.

const PLAZO_DIAS_HABILES = 15;

type HojaLean = Omit<Hoja, "_id" | "fechaLimite" | "respuesta" | "createdAt" | "updatedAt"> & {
  _id: unknown;
  fechaLimite: Date;
  respuesta?: { texto: string; fecha: Date; adminId: unknown; adminNombre: string };
  createdAt: Date;
  updatedAt: Date;
};

function aHoja(d: HojaLean): Hoja {
  return {
    _id: String(d._id),
    codigo: d.codigo,
    proveedor: {
      nombreComercial: d.proveedor.nombreComercial,
      titular: d.proveedor.titular,
      ruc: d.proveedor.ruc,
      domicilio: d.proveedor.domicilio,
      correo: d.proveedor.correo,
    },
    consumidor: {
      nombre: d.consumidor.nombre,
      tipoDocumento: d.consumidor.tipoDocumento,
      numeroDocumento: d.consumidor.numeroDocumento,
      domicilio: d.consumidor.domicilio,
      telefono: d.consumidor.telefono,
      email: d.consumidor.email,
    },
    ...(d.representante
      ? {
          representante: {
            nombre: d.representante.nombre,
            tipoDocumento: d.representante.tipoDocumento,
            numeroDocumento: d.representante.numeroDocumento,
          },
        }
      : {}),
    bien: {
      tipo: d.bien.tipo,
      descripcion: d.bien.descripcion,
      ...(typeof d.bien.montoReclamado === "number" ? { montoReclamado: d.bien.montoReclamado } : {}),
    },
    ...(d.pedidoCodigo ? { pedidoCodigo: d.pedidoCodigo } : {}),
    tipo: d.tipo,
    detalle: d.detalle,
    pedidoConsumidor: d.pedidoConsumidor,
    fechaLimite: d.fechaLimite.toISOString(),
    estado: d.estado,
    ...(d.respuesta
      ? {
          respuesta: {
            texto: d.respuesta.texto,
            fecha: d.respuesta.fecha.toISOString(),
            adminId: String(d.respuesta.adminId),
            adminNombre: d.respuesta.adminNombre,
          },
        }
      : {}),
    copiaEnviada: d.copiaEnviada === true,
    respuestaEnviada: d.respuestaEnviada === true,
    ip: d.ip ?? "",
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Año en hora de Lima. */
function anioLima(ahora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric" }).format(ahora);
}

function esDuplicado(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

/** Siguiente número del correlativo anual. Atómico: dos envíos simultáneos reciben números distintos. */
async function siguienteCorrelativo(anio: string): Promise<number> {
  const incrementar = () =>
    Counter.findOneAndUpdate(
      { _id: `reclamos-${anio}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    ).lean<{ seq: number }>();

  let doc: { seq: number } | null;
  try {
    doc = await incrementar();
  } catch (err) {
    // Primer reclamo del año en paralelo: el segundo upsert choca con _id y se reintenta como update.
    if (!esDuplicado(err)) throw err;
    doc = await incrementar();
  }
  if (!doc || typeof doc.seq !== "number") throw new Error("Correlativo de reclamos sin valor");
  return doc.seq;
}

/** Marca el resultado del envío sin tocar nada más de la hoja. */
async function marcarEnvio(id: string, campo: "copiaEnviada" | "respuestaEnviada"): Promise<void> {
  await Complaint.updateOne({ _id: id }, { $set: { [campo]: true } });
}

export async function crearReclamo(datos: ComplaintCreateInput, ctx: { ip: string }): Promise<ComplaintPublic> {
  await connectDB();

  const ahora = new Date();
  const anio = anioLima(ahora);
  const seq = await siguienteCorrelativo(anio);
  const codigo = `LR-${anio}-${String(seq).padStart(6, "0")}`;
  const fechaLimite = sumarDiasHabiles(ahora, PLAZO_DIAS_HABILES);

  // El esquema ya comprobó el celular; si alguien llama sin validar, se guarda tal cual llegó.
  const telefono = normalizarTelefono(datos.consumidor.telefono) ?? datos.consumidor.telefono;
  const pedidoCodigo = datos.pedidoCodigo?.trim();

  const creado = await Complaint.create({
    codigo,
    // Copia fija de LEGAL (D-79): la hoja no cambia aunque LEGAL cambie después.
    proveedor: {
      nombreComercial: LEGAL.nombreComercial,
      titular: LEGAL.titular,
      ruc: LEGAL.ruc,
      domicilio: LEGAL.domicilio,
      correo: LEGAL.correo,
    },
    consumidor: {
      nombre: datos.consumidor.nombre,
      tipoDocumento: datos.consumidor.tipoDocumento,
      numeroDocumento: datos.consumidor.numeroDocumento,
      domicilio: datos.consumidor.domicilio,
      telefono,
      email: datos.consumidor.email,
    },
    ...(datos.representante
      ? {
          representante: {
            nombre: datos.representante.nombre,
            tipoDocumento: datos.representante.tipoDocumento,
            numeroDocumento: datos.representante.numeroDocumento,
          },
        }
      : {}),
    bien: {
      tipo: datos.bien.tipo,
      descripcion: datos.bien.descripcion,
      ...(datos.bien.montoReclamado !== undefined ? { montoReclamado: redondear2(datos.bien.montoReclamado) } : {}),
    },
    // Solo como texto: no se busca el pedido ni se revela si existe (N1-4).
    ...(pedidoCodigo ? { pedidoCodigo } : {}),
    tipo: datos.tipo,
    detalle: datos.detalle,
    pedidoConsumidor: datos.pedidoConsumidor,
    fechaLimite,
    estado: "pendiente",
    copiaEnviada: false,
    respuestaEnviada: false,
    ip: ctx.ip,
  });

  const hoja = aHoja(creado.toObject() as HojaLean);
  log.info("reclamo.creado", { codigo, tipo: hoja.tipo });

  // Correos sin await (CLAUDE.md §7): un fallo no impide registrar la hoja; queda copiaEnviada: false.
  void enviarCopiaReclamo(hoja)
    .then(() => marcarEnvio(hoja._id, "copiaEnviada"))
    .catch((err: unknown) => log.error("reclamo.copia_fallo", err, { codigo }));
  void enviarAvisoReclamo(hoja).catch((err: unknown) => log.error("reclamo.aviso_fallo", err, { codigo }));

  return { codigo, fechaLimite: hoja.fechaLimite };
}

export async function listarReclamos(q: {
  estado?: ComplaintEstado;
  page: number;
  pageSize: number;
}): Promise<Paginated<Hoja>> {
  await connectDB();
  const filtro: Record<string, unknown> = {};
  if (q.estado) filtro.estado = q.estado;

  // Pendientes: primero los que vencen antes. Resto: los más recientes primero.
  const orden: Record<string, 1 | -1> = q.estado === "pendiente" ? { fechaLimite: 1 } : { createdAt: -1 };
  const [docs, total] = await Promise.all([
    Complaint.find(filtro)
      .sort(orden)
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean<HojaLean[]>(),
    Complaint.countDocuments(filtro),
  ]);
  return { items: docs.map(aHoja), total, page: q.page, pageSize: q.pageSize };
}

export async function obtenerReclamo(id: string): Promise<Hoja> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Reclamo");
  const d = await Complaint.findById(id).lean<HojaLean>();
  if (!d) throw noEncontrado("Reclamo");
  return aHoja(d);
}

/**
 * Responde una hoja pendiente. La respuesta es inmutable (D-80): la actualización solo aplica si la hoja
 * sigue `pendiente`, así dos respuestas simultáneas no se pisan; la segunda recibe 409 YA_RESPONDIDO.
 */
export async function responderReclamo(
  id: string,
  datos: { respuesta: string },
  actor: { adminId: string; adminNombre: string },
): Promise<Hoja> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Reclamo");

  const d = await Complaint.findOneAndUpdate(
    { _id: id, estado: "pendiente", respuesta: { $exists: false } },
    {
      $set: {
        estado: "respondido",
        respuesta: { texto: datos.respuesta, fecha: new Date(), adminId: actor.adminId, adminNombre: actor.adminNombre },
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean<HojaLean>();

  if (!d) {
    const existe = await Complaint.exists({ _id: id });
    if (!existe) throw noEncontrado("Reclamo");
    throw conflicto("Este reclamo ya fue respondido", "YA_RESPONDIDO");
  }

  const hoja = aHoja(d);
  log.info("reclamo.respondido", { codigo: hoja.codigo, tipo: hoja.tipo, adminId: actor.adminId });

  void enviarRespuestaReclamo(hoja)
    .then(() => marcarEnvio(hoja._id, "respuestaEnviada"))
    .catch((err: unknown) => log.error("reclamo.respuesta_fallo", err, { codigo: hoja.codigo }));

  return hoja;
}
