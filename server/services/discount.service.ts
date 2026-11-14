import "server-only";
import { connectDB } from "@/server/db";
import { entradaInvalida, noEncontrado } from "@/server/http/errors";
import DiscountTier from "@/models/DiscountTier";
import type { DiscountTier as NivelTipo, DiscountTierInput } from "@/types";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function listarNiveles(): Promise<NivelTipo[]> {
  await connectDB();
  const niveles = await DiscountTier.find().sort({ montoMinimo: 1 }).lean();
  return plano<NivelTipo[]>(niveles);
}

export async function listarNivelesActivos(): Promise<NivelTipo[]> {
  await connectDB();
  const niveles = await DiscountTier.find({ activo: true }).sort({ montoMinimo: 1 }).lean();
  return plano<NivelTipo[]>(niveles);
}

export async function obtenerNivel(id: string): Promise<NivelTipo> {
  await connectDB();
  const nivel = await DiscountTier.findById(id).lean();
  if (!nivel) throw noEncontrado("Descuento");
  return plano<NivelTipo>(nivel);
}

export async function crearNivel(datos: Partial<DiscountTierInput>): Promise<NivelTipo> {
  await connectDB();
  const nuevo = await DiscountTier.create(datos);
  return plano<NivelTipo>(nuevo);
}

export async function actualizarNivel(
  id: string,
  datos: Partial<DiscountTierInput>,
): Promise<NivelTipo> {
  await connectDB();
  // El esquema parcial no ve el documento guardado: se valida el resultado combinado.
  if (datos.tipoDescuento !== undefined || datos.valorDescuento !== undefined) {
    const actual = await DiscountTier.findById(id)
      .select("tipoDescuento valorDescuento")
      .lean<{ tipoDescuento?: string; valorDescuento?: number }>();
    if (!actual) throw noEncontrado("Descuento");
    const tipo = datos.tipoDescuento ?? actual.tipoDescuento ?? "porcentaje";
    const valor = datos.valorDescuento ?? actual.valorDescuento ?? 0;
    if (tipo === "porcentaje" && valor > 100) {
      throw entradaInvalida({ valorDescuento: "El porcentaje no puede superar 100" });
    }
  }
  const actualizado = await DiscountTier.findByIdAndUpdate(id, datos, {
    new: true,
    runValidators: true,
  }).lean();
  if (!actualizado) throw noEncontrado("Descuento");
  return plano<NivelTipo>(actualizado);
}

export async function eliminarNivel(id: string): Promise<void> {
  await connectDB();
  const eliminado = await DiscountTier.findByIdAndDelete(id).lean();
  if (!eliminado) throw noEncontrado("Descuento");
}
