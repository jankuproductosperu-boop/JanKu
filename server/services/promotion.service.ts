import "server-only";
import { connectDB } from "@/server/db";
import { AppError } from "@/server/http/errors";
import Promotion from "@/models/Promotion";
import type { Promotion as PromotionTipo, PromotionInput } from "@/types";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

const noEncontrada = () => new AppError(404, "Promoción no encontrada", "NO_ENCONTRADO");

export async function listarPromocionesActivas(): Promise<PromotionTipo[]> {
  await connectDB();
  const promociones = await Promotion.find({ activo: true }).sort({ orden: 1 }).lean();
  return plano<PromotionTipo[]>(promociones);
}

export async function listarPromociones(): Promise<PromotionTipo[]> {
  await connectDB();
  const promociones = await Promotion.find().sort({ orden: 1 }).lean();
  return plano<PromotionTipo[]>(promociones);
}

/** Vía pública: una promoción desactivada no existe para la tienda (mismo criterio que productos, D-20). */
export async function obtenerPromocion(id: string): Promise<PromotionTipo | null> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  await connectDB();
  // $ne: false incluye documentos antiguos sin el campo
  const promocion = await Promotion.findOne({ _id: id, activo: { $ne: false } }).lean();
  return promocion ? plano<PromotionTipo>(promocion) : null;
}

// Posición entre las activas, con el mismo orden que usa /promociones ("Promoción N")
export async function indiceDePromocion(id: string): Promise<number> {
  await connectDB();
  const activas = await Promotion.find({ activo: true }).sort({ orden: 1 }).select("_id").lean();
  const indice = activas.findIndex((p) => p._id.toString() === id);
  return indice !== -1 ? indice : 0;
}

export async function crearPromocion(datos: Partial<PromotionInput>): Promise<PromotionTipo> {
  await connectDB();
  const promocion = await Promotion.create(datos);
  return plano<PromotionTipo>(promocion);
}

export async function actualizarPromocion(
  id: string,
  datos: Partial<PromotionInput>,
): Promise<PromotionTipo> {
  await connectDB();
  const actualizada = await Promotion.findByIdAndUpdate(id, datos, { new: true }).lean();
  if (!actualizada) throw noEncontrada();
  return plano<PromotionTipo>(actualizada);
}

export async function eliminarPromocion(id: string): Promise<void> {
  await connectDB();
  const eliminada = await Promotion.findByIdAndDelete(id).lean();
  if (!eliminada) throw noEncontrada();
}
