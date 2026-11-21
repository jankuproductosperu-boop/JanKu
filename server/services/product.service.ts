import "server-only";
import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, entradaInvalida, noEncontrado } from "@/server/http/errors";
import { extractCodigoUrl } from "@/lib/productUrl";
import { estadoDeStock } from "@/lib/stock";
import { stockTotal, tieneVariantes } from "@/lib/variantes";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import { ajustarStock, asegurarColeccionMovimientos } from "@/server/services/inventory.service";
import type {
  ProductoActualizar,
  ProductoCrear,
  VarianteEntrada,
} from "@/server/validation/product.schema";
import type { Product as ProductTipo, ProductAdmin, ProductoOpcion } from "@/types";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

// Costos: nunca salen por una ruta pública ni a quien no tenga costos.ver (S1, S2)
const CAMPOS_PRIVADOS = "-precioCosto -proveedor";
// $ne: false incluye documentos antiguos que no tienen el campo
const FILTRO_PUBLICO = { activo: { $ne: false } };

type VariantePlana = {
  _id: string;
  combinacion: Record<string, string>;
  stockCantidad?: number;
  precio?: number;
  imagen?: string;
  sku?: string;
  activo?: boolean;
};

/**
 * Proyección pública (D-20 y D-68): sin costos y SIN cantidades de stock. Cada variante pública
 * lleva solo su etiqueta `stock`, calculada aquí; las inactivas no salen. Un producto sin
 * variantes no gana claves nuevas.
 */
function aPublico(doc: unknown): ProductTipo {
  const p = plano<Record<string, unknown>>(doc);
  const minimo = typeof p.stockMinimo === "number" ? p.stockMinimo : 5;
  delete p.precioCosto;
  delete p.proveedor;
  delete p.stockCantidad;
  delete p.stockMinimo;

  const variantes = Array.isArray(p.variantes) ? (p.variantes as VariantePlana[]) : [];
  if (variantes.length > 0) {
    p.variantes = variantes
      .filter((v) => v.activo !== false)
      .map((v) => ({
        _id: v._id,
        combinacion: v.combinacion,
        ...(typeof v.precio === "number" ? { precio: v.precio } : {}),
        ...(v.imagen ? { imagen: v.imagen } : {}),
        activo: true,
        stock: estadoDeStock(v.stockCantidad ?? 0, minimo),
      }));
  } else {
    delete p.variantes;
    delete p.opciones;
  }
  return p as ProductTipo;
}

export async function listarProductosPublicos(): Promise<ProductTipo[]> {
  await connectDB();
  const productos = await Product.find(FILTRO_PUBLICO).select(CAMPOS_PRIVADOS).lean().exec();
  return (Array.isArray(productos) ? productos : []).map(aPublico);
}

/** Filtros opcionales de GET /api/products (fase 24). Sin ninguno, la respuesta es la de siempre. */
export type FiltroCatalogo =
  | { tipo: "ids"; ids: string[] }
  | { tipo: "categoria"; slug: string }
  | { tipo: "home" }
  | { tipo: "relacionados"; id: string };

/**
 * Subconjunto del catálogo público, con la misma proyección y el mismo orden natural que
 * listarProductosPublicos: las páginas siguen aplicando su propio orden y filtros sobre lo que reciben,
 * así el resultado visible no cambia (N1-1); solo viaja menos.
 */
export async function listarProductosPublicosFiltrados(f: FiltroCatalogo): Promise<ProductTipo[]> {
  await connectDB();
  let filtro: Record<string, unknown>;
  let limite = 0;

  switch (f.tipo) {
    case "ids":
      filtro = { _id: { $in: f.ids } };
      break;
    case "categoria":
      // Igual que la página de categoría: el producto lleva ese slug entre sus categorías.
      filtro = { categoriaSlugs: f.slug };
      break;
    case "home":
      // Lo que usa el inicio: los marcados para el inicio y las novedades vigentes (D-58).
      filtro = { $or: [{ mostrarEnHome: true }, { nuevoHasta: { $gt: new Date() } }] };
      break;
    case "relacionados": {
      // Misma regla que tenía la ficha: misma categoría principal o mismo nombre de categoría, hasta 8.
      const base = await Product.findOne({ _id: f.id, ...FILTRO_PUBLICO })
        .select({ categoriaSlug: 1, categoria: 1 })
        .lean<{ categoriaSlug?: string | null; categoria?: string | null }>();
      if (!base) return [];
      filtro = {
        _id: { $ne: f.id },
        $or: [{ categoriaSlug: base.categoriaSlug ?? null }, { categoria: base.categoria ?? null }],
      };
      limite = 8;
      break;
    }
  }

  const consulta = Product.find({ ...filtro, ...FILTRO_PUBLICO }).select(CAMPOS_PRIVADOS);
  if (limite) consulta.limit(limite);
  const productos = await consulta.lean().exec();
  return (Array.isArray(productos) ? productos : []).map(aPublico);
}

export async function obtenerProductoPublicoPorId(id: string): Promise<ProductTipo> {
  await connectDB();
  const producto = await Product.findOne({ _id: id, ...FILTRO_PUBLICO }).select(CAMPOS_PRIVADOS).lean();
  if (!producto) throw noEncontrado("Producto");
  return aPublico(producto);
}

export async function obtenerProductoPublicoPorSlug(slugParam: string): Promise<ProductTipo | null> {
  await connectDB();

  // Misma búsqueda que obtenerProductoPorSlug, con filtro y proyección públicos
  const codigoUrl = extractCodigoUrl(slugParam);
  const porCodigo = await Product.findOne({ codigoUrl, ...FILTRO_PUBLICO }).select(CAMPOS_PRIVADOS).lean();
  if (porCodigo) return aPublico(porCodigo);

  const esObjectId = /^[0-9a-fA-F]{24}$/.test(slugParam);
  const producto = await Product.findOne({
    ...(esObjectId ? { $or: [{ slug: slugParam }, { _id: slugParam }] } : { slug: slugParam }),
    ...FILTRO_PUBLICO,
  })
    .select(CAMPOS_PRIVADOS)
    .lean();

  return producto ? aPublico(producto) : null;
}

export async function listarProductosAdmin(opts: { incluirCostos: boolean }): Promise<ProductAdmin[]> {
  await connectDB();
  const consulta = Product.find();
  if (!opts.incluirCostos) consulta.select(CAMPOS_PRIVADOS);
  const productos = await consulta.lean().exec();
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

export type ActorAdmin = { adminId: string };

function errorDuplicado(error: unknown): never {
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

// ── Variantes (fase 13b) ─────────────────────────────────────────────────────

type VarianteDoc = {
  _id: mongoose.Types.ObjectId;
  combinacion: Record<string, string>;
  stockCantidad: number;
  precio?: number;
  imagen?: string;
  sku?: string;
  activo: boolean;
};

/** Un cambio de stock de variante pendiente; siempre se aplica con ajustarStock (nunca con $set). */
type AjusteVariante = { variantId: string; cantidad: number; esperado?: number; nueva: boolean };

type VarianteGuardada = { _id: unknown; stockCantidad?: number; activo?: boolean };

const invalida = (mensaje: string) => entradaInvalida({ variantes: mensaje }, mensaje);

/**
 * Construye el arreglo a guardar y la lista de ajustes de stock (sección 13 de la fase 13b):
 * - las existentes conservan el stock de la base (el que llega del navegador no se escribe aquí);
 * - las nuevas nacen con 0;
 * - una existente que falte o un _id ajeno → 400 (D-69).
 */
function prepararVariantes(
  existentes: VarianteGuardada[],
  entrada: VarianteEntrada[],
  imagenesProducto: string[],
): { variantes: VarianteDoc[]; ajustes: AjusteVariante[] } {
  const porId = new Map(existentes.map((v) => [String(v._id), v]));
  if (porId.size > 0 && entrada.length === 0) {
    throw invalida("No se pueden quitar todas las variantes: desactívalas.");
  }

  const vistos = new Set<string>();
  for (const v of entrada) {
    if (!v._id) continue;
    if (!porId.has(v._id)) throw invalida("Una variante no pertenece a este producto. Recarga la página.");
    if (vistos.has(v._id)) throw invalida("Una variante está repetida.");
    vistos.add(v._id);
  }
  for (const id of porId.keys()) {
    if (!vistos.has(id)) throw invalida("Falta una variante que ya existía: desactívala en vez de quitarla.");
  }

  const variantes: VarianteDoc[] = [];
  const ajustes: AjusteVariante[] = [];
  for (const v of entrada) {
    const imagen = v.imagen || undefined;
    if (imagen && !imagenesProducto.includes(imagen)) {
      throw invalida("La imagen de una variante debe ser una de las imágenes del producto.");
    }
    const previa = v._id ? porId.get(v._id) : undefined;
    const _id = previa ? new mongoose.Types.ObjectId(v._id) : new mongoose.Types.ObjectId();
    const stockActual = previa ? (previa.stockCantidad ?? 0) : 0;
    variantes.push({
      _id,
      combinacion: v.combinacion,
      stockCantidad: stockActual,
      ...(typeof v.precio === "number" ? { precio: v.precio } : {}),
      ...(imagen ? { imagen } : {}),
      ...(v.sku ? { sku: v.sku } : {}),
      activo: v.activo ?? (previa ? previa.activo !== false : true),
    });
    if (v.stockCantidad !== undefined && v.stockCantidad !== stockActual) {
      ajustes.push({
        variantId: String(_id),
        cantidad: v.stockCantidad,
        esperado: previa ? v.stockEsperado : undefined,
        nueva: !previa,
      });
    }
  }
  return { variantes, ajustes };
}

async function aplicarAjustesVariantes(
  productId: string,
  ajustes: AjusteVariante[],
  actor: ActorAdmin | undefined,
  session: ClientSession,
): Promise<void> {
  // En serie: cada ajuste lee el total que dejó el anterior dentro de la misma transacción.
  for (const a of ajustes) {
    await ajustarStock({
      productId,
      variantId: a.variantId,
      modo: a.nueva ? "sumar" : "fijar",
      cantidad: a.cantidad,
      esperado: a.esperado,
      motivo: a.nueva ? "Stock inicial" : "Edición desde el panel",
      actor,
      session,
    });
  }
}

function sinVacias(opciones: ProductoOpcion[] | undefined, variantes: VarianteEntrada[] | undefined): boolean {
  return (opciones?.length ?? 0) === 0 && (variantes?.length ?? 0) === 0;
}

// ── Crear / editar / borrar ──────────────────────────────────────────────────

export async function crearProducto(datos: ProductoCrear, actor?: ActorAdmin): Promise<ProductAdmin> {
  await connectDB();
  await asegurarColeccionMovimientos();

  const { opciones, variantes: entradaVariantes, ...resto } = datos;
  const conVariantes = !sinVacias(opciones, entradaVariantes);
  // Con variantes, el total lo deriva el servidor de cada variante (D-61): se ignora el del cliente.
  const cantidad = conVariantes ? 0 : Number(datos.stockCantidad ?? 0);
  const minimo = Number(datos.stockMinimo ?? 5);
  const preparadas = conVariantes
    ? prepararVariantes([], entradaVariantes ?? [], resto.imagenes ?? [])
    : { variantes: [], ajustes: [] };

  const session = await mongoose.startSession();
  try {
    let creado: unknown;
    await session.withTransaction(async () => {
      // El texto `stock` lo deriva el modelo de la cantidad; nunca se toma del cliente.
      const [producto] = await Product.create(
        [
          {
            ...resto,
            stockCantidad: cantidad,
            stockMinimo: minimo,
            ...(conVariantes ? { opciones, variantes: preparadas.variantes } : {}),
          },
        ],
        { session },
      );
      const productId = String(producto._id);
      if (!conVariantes && cantidad > 0) {
        await StockMovement.create(
          [
            {
              productId: producto._id,
              tipo: "entrada",
              cantidad,
              stockAntes: 0,
              stockDespues: cantidad,
              motivo: "Stock inicial",
              adminId: actor?.adminId,
            },
          ],
          { session },
        );
      }
      await aplicarAjustesVariantes(productId, preparadas.ajustes, actor, session);
      creado = await Product.findById(producto._id).session(session).lean();
    });
    return plano<ProductAdmin>(creado);
  } catch (error: unknown) {
    return errorDuplicado(error);
  } finally {
    await session.endSession();
  }
}

type ProductoActual = {
  imagenes?: string[];
  stockCantidad?: number | null;
  variantes?: VarianteGuardada[];
};

export async function actualizarProducto(
  id: string,
  datos: ProductoActualizar,
  actor?: ActorAdmin,
): Promise<ProductAdmin> {
  await connectDB();
  await asegurarColeccionMovimientos();

  const { stockCantidad, stockMinimo, stockEsperado, opciones, variantes: entradaVariantes, ...resto } = datos;
  const cambios: Record<string, unknown> = { ...resto };
  // El texto `stock` jamás se escribe desde fuera: se deriva siempre de la cantidad (N1-5).
  delete cambios.stock;
  if (stockMinimo !== undefined) cambios.stockMinimo = Number(stockMinimo);
  // Código vacío = quitar el código. Guardar "" chocaría con el índice único+sparse.
  const quitaCodigo = cambios.codigo === "";
  if (quitaCodigo) delete cambios.codigo;
  // Solo se recalcula la etiqueta si la petición toca cantidad, mínimo o variantes.
  const tocaStock = stockCantidad !== undefined || stockMinimo !== undefined || entradaVariantes !== undefined;

  const session = await mongoose.startSession();
  try {
    let resultado: unknown;
    await session.withTransaction(async () => {
      const actual = await Product.findById(id)
        .select("imagenes stockCantidad variantes")
        .session(session)
        .lean<ProductoActual>();
      if (!actual) throw noEncontrado("Producto");

      // Variantes: el esquema garantiza que opciones y variantes llegan juntas.
      let ajustes: AjusteVariante[] = [];
      const yaTenia = tieneVariantes(actual);
      if (entradaVariantes !== undefined && (yaTenia || !sinVacias(opciones, entradaVariantes))) {
        const imagenes = (resto.imagenes as string[] | undefined) ?? actual.imagenes ?? [];
        const preparadas = prepararVariantes(actual.variantes ?? [], entradaVariantes, imagenes);
        ajustes = preparadas.ajustes;

        // Paso a variantes: el stock que tenía el producto sale con un movimiento antes de repartirse.
        if (!yaTenia && (actual.stockCantidad ?? 0) > 0) {
          await ajustarStock({
            productId: id,
            modo: "fijar",
            cantidad: 0,
            motivo: "Paso a variantes: el stock pasa a cada variante",
            actor,
            session,
          });
        }
        cambios.opciones = opciones;
        cambios.variantes = preparadas.variantes;
        // Total derivado del stock guardado de cada variante (cambia solo si se activa/desactiva alguna).
        cambios.stockCantidad = stockTotal(preparadas.variantes);
      }

      if (Object.keys(cambios).length > 0 || quitaCodigo) {
        await Product.findByIdAndUpdate(
          id,
          {
            ...(Object.keys(cambios).length > 0 ? { $set: cambios } : {}),
            ...(quitaCodigo ? { $unset: { codigo: 1 } } : {}),
          },
          { runValidators: true, session },
        );
      }

      // La cantidad solo cambia por inventory.service (deja movimiento). Si es igual, no hace nada.
      // Un producto con variantes la rechaza (409 USA_VARIANTE): se ajusta cada variante.
      if (stockCantidad !== undefined) {
        await ajustarStock({
          productId: id,
          modo: "fijar",
          cantidad: Number(stockCantidad),
          motivo: "Edición desde el panel",
          esperado: stockEsperado,
          actor,
          session,
        });
      }
      await aplicarAjustesVariantes(id, ajustes, actor, session);

      if (tocaStock) {
        const fin = await Product.findById(id).select("stockCantidad stockMinimo stock").session(session).lean();
        const estado = estadoDeStock(fin?.stockCantidad ?? 0, fin?.stockMinimo ?? 5);
        if (fin && fin.stock !== estado) {
          await Product.updateOne({ _id: id }, { $set: { stock: estado } }).session(session);
        }
      }

      resultado = await Product.findById(id).session(session).lean();
    });
    return plano<ProductAdmin>(resultado);
  } catch (error: unknown) {
    return errorDuplicado(error);
  } finally {
    await session.endSession();
  }
}

export async function eliminarProducto(id: string): Promise<void> {
  await connectDB();
  // Con historial de inventario no se borra: quedaría huérfano (mismo criterio que D-64).
  const conHistorial = await StockMovement.exists({ productId: id });
  if (conHistorial) {
    throw conflicto(
      "Este producto tiene historial de inventario. Desactívalo en vez de borrarlo.",
      "PRODUCTO_CON_HISTORIAL",
    );
  }
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
