import "server-only";
import { connectDB } from "@/server/db";
import { AppError, conflicto, entradaInvalida } from "@/server/http/errors";
import Category from "@/models/Category";
import Product from "@/models/Product";
import type { Category as CategoryTipo, CategoryInput } from "@/types";
import { validarMadre, type ErrorMadre } from "@/lib/categorias";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

type DatosCategoria = Partial<CategoryInput> & { nombre: string };

const noEncontrada = () => new AppError(404, "Categoría no encontrada", "NO_ENCONTRADO");
const duplicada = () => conflicto("Ya existe una categoría con ese nombre", "DUPLICADO");

// Fase 25 (D-88): un solo nivel de subcategorías.
const MENSAJE_MADRE: Record<ErrorMadre, string> = {
  NO_EXISTE: "La categoría madre no existe",
  ELLA_MISMA: "Una categoría no puede ser su propia madre",
  MADRE_ES_HIJA: "La categoría madre ya es una subcategoría; solo se permite un nivel",
  TIENE_HIJAS: "Esta categoría tiene subcategorías; no puede ser subcategoría de otra",
};

async function comprobarMadre(slug: string | null, padre: string | undefined): Promise<void> {
  if (!padre?.trim()) return;
  const todas = await Category.find({}, { slug: 1, padre: 1 }).lean<{ slug: string; padre?: string }[]>();
  const error = validarMadre(slug, padre, todas);
  if (error) throw entradaInvalida({ padre: MENSAJE_MADRE[error] }, MENSAJE_MADRE[error]);
}

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
  await comprobarMadre(null, datos.padre);
  const nueva = await Category.create(datos);
  return plano<CategoryTipo>(nueva);
}

export async function actualizarCategoria(id: string, datos: DatosCategoria): Promise<CategoryTipo> {
  await connectDB();
  const existente = await Category.findOne({ nombre: datos.nombre, _id: { $ne: id } }).lean();
  if (existente) throw duplicada();
  if (datos.padre?.trim()) {
    const actual = await Category.findById(id, { slug: 1 }).lean<{ slug: string }>();
    if (!actual) throw noEncontrada();
    await comprobarMadre(actual.slug, datos.padre);
  }

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
