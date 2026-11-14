import "server-only";
import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, entradaInvalida, noEncontrado } from "@/server/http/errors";
import { estadoDeStock, stockResultante, tipoPorDefecto, type ModoAjusteStock } from "@/lib/stock";
import { etiquetaVariante, stockTotal, tieneVariantes } from "@/lib/variantes";
import AdminUser from "@/models/AdminUser";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import type { Paginated, StockEstado, StockMovement as MovimientoTipo, StockMovimientoTipo } from "@/types";

export type AjusteStockArgs = {
  productId: string;
  /** Obligatorio si el producto tiene variantes (D-61); prohibido si no las tiene. */
  variantId?: string;
  modo: ModoAjusteStock;
  cantidad: number; // entero >= 0
  motivo?: string;
  tipo?: StockMovimientoTipo; // por defecto: sumar→entrada, restar→salida, fijar→ajuste
  orderId?: string;
  /** Stock que vio quien pide el cambio (del producto o de la variante). Si el actual es otro, 409 STOCK_CAMBIO. */
  esperado?: number;
  actor?: { adminId: string };
  session?: ClientSession; // si llega, se usa esa transacción; si no, se abre una propia
};

/** stockAntes/stockDespues son los de la variante si hay `variantId`; `stock` y `stockTotal`, los del producto. */
export type AjusteStockResultado = {
  stockAntes: number;
  stockDespues: number;
  stock: StockEstado;
  stockTotal?: number;
};

type VarianteLean = {
  _id: unknown;
  combinacion: Record<string, string>;
  stockCantidad?: number;
  activo?: boolean;
};
type ProductoLean = {
  stockCantidad?: number | null;
  stockMinimo?: number;
  opciones?: { nombre: string }[];
  variantes?: VarianteLean[];
};

function comprobarEsperado(esperado: number | undefined, antes: number): void {
  if (esperado !== undefined && antes !== esperado) {
    throw conflicto(
      `El stock cambió mientras editabas (ahora hay ${antes}). Recarga y vuelve a intentarlo.`,
      "STOCK_CAMBIO",
    );
  }
}

const cambioConcurrente = () =>
  conflicto("El stock cambió mientras se procesaba. Intenta de nuevo.", "STOCK_CAMBIO");

/** Lectura + escritura condicional + movimiento, todo en la sesión recibida (algoritmo de la fase 13 y 13b). */
async function aplicarAjuste(args: AjusteStockArgs, s: ClientSession): Promise<AjusteStockResultado> {
  const p = await Product.findById(args.productId)
    .select("stockCantidad stockMinimo opciones variantes")
    .session(s)
    .lean<ProductoLean>();
  if (!p) throw noEncontrado("Producto");

  const minimo = p.stockMinimo ?? 5;
  const conVariantes = tieneVariantes(p);

  if (args.variantId) {
    if (!conVariantes) {
      throw entradaInvalida({ variantId: "Este producto no tiene variantes" }, "Este producto no tiene variantes");
    }
    return aplicarAjusteVariante(args, p, minimo, s);
  }
  if (conVariantes) {
    throw conflicto("Este producto tiene variantes: ajusta el stock de cada variante.", "USA_VARIANTE");
  }

  const crudo = p.stockCantidad;
  const antes = crudo ?? 0;
  comprobarEsperado(args.esperado, antes);
  const despues = stockResultante(args.modo, antes, args.cantidad);

  if (despues < 0) throw conflicto(`Stock insuficiente: hay ${antes}`, "SIN_STOCK");

  const stock = estadoDeStock(despues, minimo);
  // Nunca se crean movimientos de 0.
  if (despues === antes) return { stockAntes: antes, stockDespues: despues, stock };

  // Escritura condicional: solo si nadie cambió el stock desde la lectura.
  const res = await Product.updateOne(
    // `null` también casa con documentos antiguos a los que aún les falta el campo (migración 002).
    { _id: args.productId, stockCantidad: crudo ?? null },
    { $set: { stockCantidad: despues, stock } },
  ).session(s);
  if (res.modifiedCount !== 1) throw cambioConcurrente();

  await crearMovimiento(args, antes, despues, s);
  return { stockAntes: antes, stockDespues: despues, stock };
}

/** Algoritmo de la sección 5 de la fase 13b. */
async function aplicarAjusteVariante(
  args: AjusteStockArgs,
  p: ProductoLean,
  minimo: number,
  s: ClientSession,
): Promise<AjusteStockResultado> {
  const variantes = p.variantes ?? [];
  const v = variantes.find((x) => String(x._id) === args.variantId);
  if (!v) throw noEncontrado("Variante");
  const restando = args.modo === "restar" || args.tipo === "pedido";
  if (v.activo === false && restando) {
    throw conflicto("Esta variante está desactivada.", "VARIANTE_INACTIVA");
  }

  const antes = v.stockCantidad ?? 0;
  comprobarEsperado(args.esperado, antes);
  const despues = stockResultante(args.modo, antes, args.cantidad);
  if (despues < 0) throw conflicto(`Stock insuficiente: hay ${antes}`, "SIN_STOCK");

  const totalNuevo = stockTotal(
    variantes.map((x) => ({
      stockCantidad: x === v ? despues : (x.stockCantidad ?? 0),
      activo: x.activo !== false,
    })),
  );
  const stock = estadoDeStock(totalNuevo, minimo);
  if (despues === antes) return { stockAntes: antes, stockDespues: despues, stock, stockTotal: totalNuevo };

  // Escritura condicional sobre la variante: solo si su stock sigue siendo el leído.
  const res = await Product.updateOne(
    { _id: args.productId, variantes: { $elemMatch: { _id: v._id, stockCantidad: antes } } },
    { $set: { "variantes.$.stockCantidad": despues, stockCantidad: totalNuevo, stock } },
  ).session(s);
  if (res.modifiedCount !== 1) throw cambioConcurrente();

  const orden = (p.opciones ?? []).map((o) => o.nombre);
  await crearMovimiento(args, antes, despues, s, etiquetaVariante(v.combinacion, orden));
  return { stockAntes: antes, stockDespues: despues, stock, stockTotal: totalNuevo };
}

async function crearMovimiento(
  args: AjusteStockArgs,
  antes: number,
  despues: number,
  s: ClientSession,
  varianteEtiqueta?: string,
): Promise<void> {
  await StockMovement.create(
    [
      {
        productId: args.productId,
        tipo: args.tipo ?? tipoPorDefecto(args.modo),
        cantidad: despues - antes,
        stockAntes: antes,
        stockDespues: despues,
        motivo: args.motivo || undefined,
        orderId: args.orderId,
        adminId: args.actor?.adminId,
        variantId: args.variantId,
        varianteEtiqueta,
      },
    ],
    { session: s },
  );
}

let initMovimientos: Promise<unknown> | null = null;

/** Asegura una sola vez por proceso que la colección y sus índices existen antes de la primera transacción. */
export function asegurarColeccionMovimientos(): Promise<unknown> {
  if (!initMovimientos) {
    initMovimientos = StockMovement.init().catch((err: unknown) => {
      initMovimientos = null; // se reintenta en la siguiente llamada
      throw err;
    });
  }
  return initMovimientos;
}

/** Cambia el stock de un producto y deja un movimiento. Es la ÚNICA vía para escribir stockCantidad. */
export async function ajustarStock(args: AjusteStockArgs): Promise<AjusteStockResultado> {
  await connectDB();
  await asegurarColeccionMovimientos();
  if (args.session) return aplicarAjuste(args, args.session);

  const session = await mongoose.startSession();
  try {
    let resultado: AjusteStockResultado | undefined;
    // withTransaction reintenta solo ante conflictos transitorios (otro ajuste simultáneo).
    await session.withTransaction(async () => {
      resultado = await aplicarAjuste(args, session);
    });
    if (!resultado) throw new Error("La transacción de stock no devolvió resultado");
    return resultado;
  } finally {
    await session.endSession();
  }
}

type MovimientoDoc = {
  _id: unknown;
  productId: unknown;
  tipo: StockMovimientoTipo;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  motivo?: string;
  orderId?: unknown;
  adminId?: unknown;
  variantId?: unknown;
  varianteEtiqueta?: string;
  createdAt: Date;
};

export async function listarMovimientos(args: {
  productId: string;
  variantId?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<MovimientoTipo>> {
  await connectDB();
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));

  const filtro = { productId: args.productId, ...(args.variantId ? { variantId: args.variantId } : {}) };
  const [docs, total] = await Promise.all([
    StockMovement.find(filtro)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<MovimientoDoc[]>(),
    StockMovement.countDocuments(filtro),
  ]);

  // Nombre de quien lo hizo, con una sola consulta.
  const ids = [...new Set(docs.map((d) => (d.adminId ? String(d.adminId) : "")).filter(Boolean))];
  const admins = ids.length
    ? await AdminUser.find({ _id: { $in: ids } }).select("nombre").lean<{ _id: unknown; nombre?: string }[]>()
    : [];
  const nombres = new Map(admins.map((a) => [String(a._id), a.nombre ?? ""]));

  const items: MovimientoTipo[] = docs.map((d) => ({
    _id: String(d._id),
    productId: String(d.productId),
    tipo: d.tipo,
    cantidad: d.cantidad,
    stockAntes: d.stockAntes,
    stockDespues: d.stockDespues,
    motivo: d.motivo || undefined,
    orderId: d.orderId ? String(d.orderId) : undefined,
    variantId: d.variantId ? String(d.variantId) : undefined,
    varianteEtiqueta: d.varianteEtiqueta || undefined,
    adminId: d.adminId ? String(d.adminId) : undefined,
    adminNombre: d.adminId ? nombres.get(String(d.adminId)) || undefined : undefined,
    createdAt: d.createdAt.toISOString(),
  }));

  return { items, total, page, pageSize };
}
