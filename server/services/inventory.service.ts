import "server-only";
import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, noEncontrado } from "@/server/http/errors";
import { estadoDeStock, stockResultante, tipoPorDefecto, type ModoAjusteStock } from "@/lib/stock";
import AdminUser from "@/models/AdminUser";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import type { Paginated, StockEstado, StockMovement as MovimientoTipo, StockMovimientoTipo } from "@/types";

export type AjusteStockArgs = {
  productId: string;
  modo: ModoAjusteStock;
  cantidad: number; // entero >= 0
  motivo?: string;
  tipo?: StockMovimientoTipo; // por defecto: sumar→entrada, restar→salida, fijar→ajuste
  orderId?: string;
  /** Stock que vio quien pide el cambio. Si el actual es otro, 409 STOCK_CAMBIO (evita pisar ajustes ajenos). */
  esperado?: number;
  actor?: { adminId: string };
  session?: ClientSession; // si llega, se usa esa transacción; si no, se abre una propia
};

export type AjusteStockResultado = { stockAntes: number; stockDespues: number; stock: StockEstado };

/** Lectura + escritura condicional + movimiento, todo en la sesión recibida (algoritmo de la fase 13). */
async function aplicarAjuste(args: AjusteStockArgs, s: ClientSession): Promise<AjusteStockResultado> {
  const p = await Product.findById(args.productId).select("stockCantidad stockMinimo").session(s).lean();
  if (!p) throw noEncontrado("Producto");

  const crudo = p.stockCantidad as number | null | undefined;
  const antes = crudo ?? 0;
  const minimo = p.stockMinimo ?? 5;
  if (args.esperado !== undefined && antes !== args.esperado) {
    throw conflicto(
      `El stock cambió mientras editabas (ahora hay ${antes}). Recarga y vuelve a intentarlo.`,
      "STOCK_CAMBIO",
    );
  }
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
  if (res.modifiedCount !== 1) {
    throw conflicto("El stock cambió mientras se procesaba. Intenta de nuevo.", "STOCK_CAMBIO");
  }

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
      },
    ],
    { session: s },
  );

  return { stockAntes: antes, stockDespues: despues, stock };
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
  createdAt: Date;
};

export async function listarMovimientos(args: {
  productId: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<MovimientoTipo>> {
  await connectDB();
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));

  const [docs, total] = await Promise.all([
    StockMovement.find({ productId: args.productId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<MovimientoDoc[]>(),
    StockMovement.countDocuments({ productId: args.productId }),
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
    adminId: d.adminId ? String(d.adminId) : undefined,
    adminNombre: d.adminId ? nombres.get(String(d.adminId)) || undefined : undefined,
    createdAt: d.createdAt.toISOString(),
  }));

  return { items, total, page, pageSize };
}
