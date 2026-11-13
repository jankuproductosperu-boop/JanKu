import "server-only";
import { connectDB } from "@/server/db";
import { AppError, conflicto } from "@/server/http/errors";
import Category from "@/models/Category";
import Product from "@/models/Product";
import type { Category as CategoryTipo, CategoryInput } from "@/types";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

type DatosCategoria = Partial<CategoryInput> & { nombre: string };

const noEncontrada = () => new AppError(404, "Categoría no encontrada", "NO_ENCONTRADO");
const duplicada = () => conflicto("Ya existe una categoría con ese nombre", "DUPLICADO");

export async function listarCategorias(): Promise<CategoryTipo[]> {
  await connectDB();
  const categorias = await Category.find().sort({ orden: 1, nombre: 1 }).lean();
  return plano<CategoryTipo[]>(categorias);
}

export async function obtenerCategoria(id: string): Promise<CategoryTipo> {
  await connectDB();
  const categoria = await Category.findById(id).lean();
  if (!categoria) throw noEncontrada();
  return plano<CategoryTipo>(categoria);
}

export async function crearCategoria(datos: DatosCategoria): Promise<CategoryTipo> {
  await connectDB();
  const existente = await Category.findOne({ nombre: datos.nombre }).lean();
  if (existente) throw duplicada();
  const nueva = await Category.create(datos);
  return plano<CategoryTipo>(nueva);
}

export async function actualizarCategoria(id: string, datos: DatosCategoria): Promise<CategoryTipo> {
  await connectDB();
  const existente = await Category.findOne({ nombre: datos.nombre, _id: { $ne: id } }).lean();
  if (existente) throw duplicada();

  const actualizada = await Category.findByIdAndUpdate(id, datos, { new: true }).lean();
  if (!actualizada) throw noEncontrada();
  return plano<CategoryTipo>(actualizada);
}

export async function eliminarCategoria(id: string): Promise<void> {
  await connectDB();
  const categoria = await Category.findById(id).lean();
  if (!categoria) throw noEncontrada();

  const cantidad = await Product.countDocuments({ categoriaSlugs: categoria.slug });
  if (cantidad > 0) {
    throw conflicto(
      `No se puede eliminar. Hay ${cantidad} producto(s) asociado(s)`,
      "CATEGORIA_CON_PRODUCTOS",
    );
  }

  await Category.findByIdAndDelete(id).lean();
}
