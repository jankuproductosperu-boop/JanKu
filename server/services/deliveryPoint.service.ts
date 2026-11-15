import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/server/db";
import { noEncontrado } from "@/server/http/errors";
import DeliveryPoint from "@/models/DeliveryPoint";
import type { DeliveryPoint as PuntoTipo, DeliveryPointInput, DeliveryPointPublic } from "@/types";

// Puntos de entrega (fase 16b, D-72). Sin caché: lo que se edita en el panel se ve al momento en el checkout.
// No hay función de borrar: un punto se desactiva (N1-3).

type PuntoLean = {
  _id: unknown;
  nombre: string;
  direccion: string;
  referencia?: string;
  horario?: string;
  activo?: boolean;
  orden?: number;
};

const ORDEN = { orden: 1, nombre: 1 } as const;

function aAdmin(p: PuntoLean): PuntoTipo {
  return {
    _id: String(p._id),
    nombre: p.nombre,
    direccion: p.direccion,
    referencia: p.referencia ?? "",
    horario: p.horario ?? "",
    activo: p.activo !== false,
    orden: p.orden ?? 0,
  };
}

/** Lista blanca explícita: solo estos campos salen por la API pública. */
function aPublico(p: PuntoLean): DeliveryPointPublic {
  return {
    _id: String(p._id),
    nombre: p.nombre,
    direccion: p.direccion,
    referencia: p.referencia || undefined,
    horario: p.horario || undefined,
  };
}

export async function listarPuntosActivos(): Promise<DeliveryPointPublic[]> {
  await connectDB();
  const docs = await DeliveryPoint.find({ activo: true }).sort(ORDEN).lean<PuntoLean[]>();
  return docs.map(aPublico);
}

export async function listarPuntos(): Promise<PuntoTipo[]> {
  await connectDB();
  const docs = await DeliveryPoint.find().sort(ORDEN).lean<PuntoLean[]>();
  return docs.map(aAdmin);
}

/** Para crearPedido: el punto solo sirve si existe y está activo; si no, null. */
export async function obtenerPuntoActivo(id: string): Promise<PuntoTipo | null> {
  await connectDB();
  if (!isValidObjectId(id)) return null;
  const p = await DeliveryPoint.findOne({ _id: id, activo: true }).lean<PuntoLean>();
  return p ? aAdmin(p) : null;
}

export async function crearPunto(datos: Partial<DeliveryPointInput>): Promise<PuntoTipo> {
  await connectDB();
  const nuevo = await DeliveryPoint.create(datos);
  return aAdmin(nuevo.toObject() as PuntoLean);
}

export async function actualizarPunto(id: string, datos: Partial<DeliveryPointInput>): Promise<PuntoTipo> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Punto de entrega");
  const actualizado = await DeliveryPoint.findByIdAndUpdate(id, { $set: datos }, { new: true, runValidators: true })
    .lean<PuntoLean>();
  if (!actualizado) throw noEncontrado("Punto de entrega");
  return aAdmin(actualizado);
}
