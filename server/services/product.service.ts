import "server-only";
import { connectDB } from "@/server/db";
import { conflicto, noEncontrado } from "@/server/http/errors";
import { extractCodigoUrl } from "@/lib/productUrl";
import { estadoDeStock } from "@/lib/stock";
import Product from "@/models/Product";
import type { Product as ProductTipo, ProductAdmin, ProductInput } from "@/types";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

// Lo que nunca sale por una ruta pública (S1, S2)
const CAMPOS_PRIVADOS = "-precioCosto -proveedor";
// $ne: false incluye documentos antiguos que no tienen el campo
const FILTRO_PUBLICO = { activo: { $ne: false } };

export async function listarProductosPublicos(): Promise<ProductTipo[]> {
  await connectDB();
  const productos = await Product.find(FILTRO_PUBLICO).select(CAMPOS_PRIVADOS).lean().exec();
  return plano<ProductTipo[]>(Array.isArray(productos) ? productos : []);
}

export async function obtenerProductoPublicoPorId(id: string): Promise<ProductTipo> {
  await connectDB();
  const producto = await Product.findOne({ _id: id, ...FILTRO_PUBLICO }).select(CAMPOS_PRIVADOS).lean();
  if (!producto) throw noEncontrado("Producto");
  return plano<ProductTipo>(producto);
}

export async function obtenerProductoPublicoPorSlug(slugParam: string): Promise<ProductTipo | null> {
  await connectDB();

  // Misma búsqueda que obtenerProductoPorSlug, con filtro y proyección públicos
  const codigoUrl = extractCodigoUrl(slugParam);
  const porCodigo = await Product.findOne({ codigoUrl, ...FILTRO_PUBLICO }).select(CAMPOS_PRIVADOS).lean();
  if (porCodigo) return plano<ProductTipo>(porCodigo);

  const esObjectId = /^[0-9a-fA-F]{24}$/.test(slugParam);
  const producto = await Product.findOne({
    ...(esObjectId ? { $or: [{ slug: slugParam }, { _id: slugParam }] } : { slug: slugParam }),
    ...FILTRO_PUBLICO,
  })
    .select(CAMPOS_PRIVADOS)
    .lean();

  return producto ? plano<ProductTipo>(producto) : null;
}

export async function listarProductosAdmin(opts: { incluirCostos: boolean }): Promise<ProductAdmin[]> {
  await connectDB();
  const consulta = Product.find();
  if (!opts.incluirCostos) consulta.select(CAMPOS_PRIVADOS);
  const productos = await consulta.lean().exec();
  return plano<ProductAdmin[]>(Array.isArray(productos) ? productos : []);
}

export async function listarProductos(): Promise<ProductAdmin[]> {
  await connectDB();
  const productos = await Product.find().lean().exec();
  return plano<ProductAdmin[]>(Array.isArray(productos) ? productos : []);
}

export async function obtenerProductoPorId(id: string): Promise<ProductAdmin> {
  await connectDB();
  const producto = await Product.findById(id).lean();
  if (!producto) throw noEncontrado("Producto");
  return plano<ProductAdmin>(producto);
}

export async function obtenerProductoPorSlug(slugParam: string): Promise<ProductAdmin | null> {
  await connectDB();

  // 1. Intentar por el código corto: es como funcionan los links nuevos
  const codigoUrl = extractCodigoUrl(slugParam);
  const porCodigo = await Product.findOne({ codigoUrl }).lean();
  if (porCodigo) return plano<ProductAdmin>(porCodigo);

  // 2. Fallback: links viejos ya compartidos, o alguien que entró directo con el _id
  const esObjectId = /^[0-9a-fA-F]{24}$/.test(slugParam);
  const producto = await Product.findOne(
    esObjectId ? { $or: [{ slug: slugParam }, { _id: slugParam }] } : { slug: slugParam },
  ).lean();

  return producto ? plano<ProductAdmin>(producto) : null;
}

export async function crearProducto(datos: ProductInput): Promise<ProductAdmin> {
  await connectDB();
  const producto = await Product.create(datos);
  return plano<ProductAdmin>(producto);
}

export async function actualizarProducto(
  id: string,
  datos: Partial<ProductInput>,
): Promise<ProductAdmin> {
  await connectDB();
  const cambios: Partial<ProductInput> = { ...datos };

  // findByIdAndUpdate NO dispara el hook pre('validate') del modelo, así que si
  // vienen cambios de inventario se recalcula aquí la etiqueta de stock.
  if (datos.stockCantidad !== undefined || datos.stockMinimo !== undefined) {
    const actual = await Product.findById(id).select("stockCantidad stockMinimo").lean();
    const cantidad =
      datos.stockCantidad !== undefined ? Number(datos.stockCantidad) : (actual?.stockCantidad ?? 0);
    const minimo =
      datos.stockMinimo !== undefined ? Number(datos.stockMinimo) : (actual?.stockMinimo ?? 5);
    cambios.stock = estadoDeStock(cantidad, minimo);
  }

  let actualizado;
  try {
    actualizado = await Product.findByIdAndUpdate(
      id,
      { $set: cambios },
      { new: true, runValidators: true },
    ).lean();
  } catch (error: unknown) {
    const err = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000) {
      const campo = err.keyPattern ? Object.keys(err.keyPattern)[0] : "campo";
      const nombreCampo = campo === "codigo" ? "código" : campo === "slug" ? "nombre/slug" : campo;
      throw conflicto(
        `Ya existe otro producto con ese mismo ${nombreCampo}. Usa uno diferente.`,
        "DUPLICADO",
      );
    }
    throw error;
  }

  if (!actualizado) throw noEncontrado("Producto");
  return plano<ProductAdmin>(actualizado);
}

export async function eliminarProducto(id: string): Promise<void> {
  await connectDB();
  const eliminado = await Product.findByIdAndDelete(id).lean();
  if (!eliminado) throw noEncontrado("Producto");
}

export async function reordenarProductos(
  contexto: string,
  orden: { id: string; orden: number }[],
): Promise<{ actualizados: number }> {
  await connectDB();
  const esHome = contexto === "home";

  const operaciones = orden.map(({ id, orden: posicion }) => ({
    updateOne: {
      filter: { _id: id },
      // Clave dinámica dentro del Map: MongoDB actualiza una sola clave sin tocar las demás
      update: {
        $set: esHome ? { ordenHome: posicion } : { [`ordenPorCategoria.${contexto}`]: posicion },
      },
    },
  }));

  const resultado = await Product.bulkWrite(operaciones);
  return { actualizados: resultado.modifiedCount ?? operaciones.length };
}
