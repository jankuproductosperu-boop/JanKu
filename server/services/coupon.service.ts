import "server-only";
import { isValidObjectId, type ClientSession } from "mongoose";
import { connectDB } from "@/server/db";
import { conflicto, entradaInvalida, noEncontrado } from "@/server/http/errors";
import { log } from "@/server/logger";
import { listarNivelesActivos } from "@/server/services/discount.service";
import { MENSAJES_CUPON, evaluarCupon, normalizarCodigo } from "@/lib/coupon";
import { normalizarTelefono } from "@/lib/phone";
import { calcularSubtotal, calcularTotales, type Linea, type Totales } from "@/lib/pricing";
import Coupon from "@/models/Coupon";
import CouponRedemption from "@/models/CouponRedemption";
import type { Coupon as CuponTipo, CouponInput, CouponValidateResult, DiscountTier } from "@/types";

// Cupones (fase 18, D-38 a D-44). Ninguna función borra cupones ni canjes (N1-3).
// `usosActuales` solo cambia con $inc condicional dentro de la transacción que recibe consumir/liberar.

type CuponLean = {
  _id: unknown;
  codigo: string;
  descripcion?: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  topeDescuento?: number | null;
  montoMinimo?: number;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  usosMaximos?: number | null;
  usosPorCliente?: number;
  usosActuales?: number;
  acumulable?: boolean;
  activo?: boolean;
  creadoPor?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const FORMATO_CODIGO = /^[A-Z0-9-]{4,20}$/;

function aCupon(c: CuponLean): CuponTipo {
  return {
    _id: String(c._id),
    codigo: c.codigo,
    descripcion: c.descripcion ?? "",
    tipo: c.tipo,
    valor: c.valor,
    topeDescuento: c.topeDescuento ?? null,
    montoMinimo: c.montoMinimo ?? 0,
    fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString() : null,
    fechaFin: c.fechaFin ? c.fechaFin.toISOString() : null,
    usosMaximos: c.usosMaximos ?? null,
    usosPorCliente: c.usosPorCliente ?? 1,
    usosActuales: c.usosActuales ?? 0,
    acumulable: c.acumulable === true,
    activo: c.activo !== false,
    creadoPor: c.creadoPor ? String(c.creadoPor) : undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

let initColecciones: Promise<unknown> | null = null;

/**
 * Crea las colecciones (y sus índices) antes de la primera transacción: dentro de una transacción
 * no conviene crear colecciones de forma implícita. Mismo patrón que asegurarColeccionMovimientos.
 */
export function asegurarColeccionesCupon(): Promise<unknown> {
  if (!initColecciones) {
    initColecciones = Promise.all([Coupon.init(), CouponRedemption.init()]).catch((err: unknown) => {
      initColecciones = null; // se reintenta en la siguiente llamada
      throw err;
    });
  }
  return initColecciones;
}

// ── Cliente (D-42) ────────────────────────────────────────────────────────────────────────────────────

/** "user:<id>" si hay sesión; si no, "tel:<51…>" con el teléfono normalizado; si no hay ninguno, null. */
export function claveCliente(a: { userId?: string; telefono?: string }): string | null {
  if (a.userId) return `user:${a.userId}`;
  const tel = a.telefono ? normalizarTelefono(a.telefono) : null;
  return tel ? `tel:${tel}` : null;
}

// ── Validación (solo lectura) ─────────────────────────────────────────────────────────────────────────

const noValido = (motivo: keyof typeof MENSAJES_CUPON): CouponValidateResult => ({
  valido: false,
  motivo,
  mensaje: MENSAJES_CUPON[motivo],
});

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

export type CuponParaPedido = {
  resultado: CouponValidateResult;
  /** Solo si `resultado.valido`: lo que crearPedido necesita para guardar y consumir. */
  couponId?: string;
  codigo?: string;
  totales?: Totales;
};

/**
 * Núcleo de validarCupon. crearPedido lo usa para obtener además el id del cupón y los totales completos
 * (incluido el nivel), calculados con la misma calcularTotales (N1-5). SOLO LECTURA.
 */
export async function evaluarCuponParaPedido(a: {
  codigo: string;
  lineas: Linea[];
  clienteKey: string | null;
  niveles: DiscountTier[];
}): Promise<CuponParaPedido> {
  await connectDB();
  const codigo = normalizarCodigo(a.codigo);
  // Un formato imposible responde igual que un código inexistente (D-43), sin consultar la base.
  if (!FORMATO_CODIGO.test(codigo)) return { resultado: noValido("no_valido") };

  const c = await Coupon.findOne({ codigo }).lean<CuponLean>();
  if (!c) return { resultado: noValido("no_valido") };

  const usosDelCliente = a.clienteKey
    ? await CouponRedemption.countDocuments({ couponId: c._id, clienteKey: a.clienteKey, estado: "aplicado" })
    : 0;

  const evaluacion = evaluarCupon(
    {
      activo: c.activo !== false,
      fechaInicio: c.fechaInicio ?? null,
      fechaFin: c.fechaFin ?? null,
      usosMaximos: c.usosMaximos ?? null,
      usosActuales: c.usosActuales ?? 0,
      usosPorCliente: c.usosPorCliente ?? 1,
      montoMinimo: c.montoMinimo ?? 0,
    },
    { subtotal: calcularSubtotal(a.lineas), ahora: new Date(), usosDelCliente },
  );
  if (!evaluacion.valido) return { resultado: noValido(evaluacion.motivo) };

  const totales = calcularTotales({
    lineas: a.lineas,
    niveles: a.niveles,
    cupon: {
      codigo: c.codigo,
      tipo: c.tipo,
      valor: c.valor,
      topeDescuento: c.topeDescuento ?? null,
      montoMinimo: c.montoMinimo ?? 0,
      acumulable: c.acumulable === true,
    },
  });

  // "ninguno": ni el cupón ni el nivel descuentan nada (p. ej. subtotal 0). Un cupón que no descuenta no se usa.
  if (totales.aplicado === "ninguno") return { resultado: noValido("no_valido") };

  const aplicado = totales.aplicado;
  const mensaje =
    aplicado === "nivel"
      ? "Tu descuento por monto de compra es mayor que este cupón, así que aplicamos ese."
      : `Cupón aplicado: ahorras ${soles(totales.descuentoCupon)}`;

  return {
    resultado: {
      valido: true,
      codigo: c.codigo,
      aplicado,
      descuentoCupon: totales.descuentoCupon,
      descuentoNivel: totales.descuentoNivel,
      descuentoTotal: totales.descuentoTotal,
      total: totales.total,
      mensaje,
    },
    couponId: String(c._id),
    codigo: c.codigo,
    totales,
  };
}

/** Para POST /api/coupons/validate. SOLO LECTURA: no reserva ni consume nada. */
export async function validarCupon(a: {
  codigo: string;
  lineas: Linea[];
  clienteKey: string | null;
}): Promise<CouponValidateResult> {
  const niveles = await listarNivelesActivos();
  const { resultado } = await evaluarCuponParaPedido({ ...a, niveles });
  return resultado;
}

// ── Consumo y liberación (dentro de la transacción del pedido) ───────────────────────────────────────

/**
 * Orden obligatorio (fase 18 §5). El paso 1 escribe en el documento del cupón ANTES de contar los canjes:
 * así dos pedidos simultáneos con el mismo cupón chocan y se ejecutan uno tras otro.
 */
export async function consumirCupon(a: {
  couponId: string;
  orderId: string;
  clienteKey: string;
  monto: number;
  session: ClientSession;
}): Promise<void> {
  // 1. Incremento atómico y condicional: no pasa del máximo ni con peticiones simultáneas.
  const res = await Coupon.updateOne(
    {
      _id: a.couponId,
      activo: true,
      $or: [{ usosMaximos: null }, { $expr: { $lt: ["$usosActuales", "$usosMaximos"] } }],
    },
    { $inc: { usosActuales: 1 } },
    { session: a.session },
  );
  if (res.modifiedCount !== 1) throw conflicto(MENSAJES_CUPON.no_valido, "CUPON_NO_VALIDO");

  // 2. Límite por cliente, contado dentro de la misma transacción.
  const cupon = await Coupon.findById(a.couponId)
    .select("usosPorCliente")
    .session(a.session)
    .lean<{ usosPorCliente?: number }>();
  const usos = await CouponRedemption.countDocuments({
    couponId: a.couponId,
    clienteKey: a.clienteKey,
    estado: "aplicado",
  }).session(a.session);
  if (usos >= (cupon?.usosPorCliente ?? 1)) {
    throw conflicto(MENSAJES_CUPON.ya_usado, "CUPON_YA_USADO"); // la transacción revierte el paso 1
  }

  // 3. Canje.
  await CouponRedemption.create(
    [{ couponId: a.couponId, orderId: a.orderId, clienteKey: a.clienteKey, monto: a.monto, estado: "aplicado" }],
    { session: a.session },
  );
}

/** Al cancelar el pedido: el canje pasa a "liberado" y se devuelve el uso. Si no hay canje, no hace nada. */
export async function liberarCupon(a: { orderId: string; session: ClientSession }): Promise<void> {
  const canje = await CouponRedemption.findOneAndUpdate(
    { orderId: a.orderId, estado: "aplicado" },
    { $set: { estado: "liberado" } },
    { session: a.session, returnDocument: "after" },
  ).lean<{ couponId: unknown }>();
  if (!canje) return;
  await Coupon.updateOne(
    { _id: canje.couponId, usosActuales: { $gt: 0 } },
    { $inc: { usosActuales: -1 } },
    { session: a.session },
  );
}

// ── Administración ────────────────────────────────────────────────────────────────────────────────────

export async function listarCupones(): Promise<CuponTipo[]> {
  await connectDB();
  const docs = await Coupon.find().sort({ createdAt: -1 }).lean<CuponLean[]>();
  return docs.map(aCupon);
}

export async function crearCupon(datos: CouponInput, actor: { adminId: string }): Promise<CuponTipo> {
  await connectDB();
  // `usosActuales` no viene en `datos` (el esquema es .strict()): siempre empieza en 0.
  const nuevo = await Coupon.create({ ...datos, usosActuales: 0, creadoPor: actor.adminId });
  log.info("cupon.creado", { codigo: nuevo.codigo, adminId: actor.adminId });
  const c = await Coupon.findById(nuevo._id).lean<CuponLean>();
  if (!c) throw noEncontrado("Cupón");
  return aCupon(c);
}

/** `codigo` no es editable. `tipo` y `valor` solo mientras el cupón no tenga usos. */
export async function actualizarCupon(id: string, datos: Partial<CouponInput>): Promise<CuponTipo> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Cupón");
  const actual = await Coupon.findById(id).lean<CuponLean>();
  if (!actual) throw noEncontrado("Cupón");

  const cambios: Record<string, unknown> = { ...datos };
  delete cambios.codigo; // defensa: el esquema ya no lo acepta

  const cambiaTipoOValor =
    (datos.tipo !== undefined && datos.tipo !== actual.tipo) ||
    (datos.valor !== undefined && datos.valor !== actual.valor);
  if (cambiaTipoOValor && (actual.usosActuales ?? 0) > 0) {
    throw conflicto(
      "No se puede cambiar el tipo o valor de un cupón ya usado. Desactívalo y crea otro.",
      "CUPON_EN_USO",
    );
  }

  // Reglas entre campos con el resultado final (lo que llega + lo guardado).
  const tipo = datos.tipo ?? actual.tipo;
  const valor = datos.valor ?? actual.valor;
  const tope = datos.topeDescuento !== undefined ? datos.topeDescuento : (actual.topeDescuento ?? null);
  const inicio = datos.fechaInicio !== undefined ? datos.fechaInicio : (actual.fechaInicio ?? null);
  const fin = datos.fechaFin !== undefined ? datos.fechaFin : (actual.fechaFin ?? null);
  const errores: Record<string, string> = {};
  if (tipo === "porcentaje" && valor > 100) errores.valor = "El porcentaje no puede superar 100";
  if (tipo !== "porcentaje" && tope != null) errores.topeDescuento = "El tope solo aplica a porcentaje";
  if (inicio && fin && !(inicio < fin)) errores.fechaFin = "Debe ser posterior al inicio";
  if (Object.keys(errores).length) throw entradaInvalida(errores);

  // Si cambia tipo o valor, el filtro exige que siga sin usos: un pedido simultáneo no se cuela.
  const filtro: Record<string, unknown> = { _id: id };
  if (cambiaTipoOValor) filtro.usosActuales = 0;
  const c = await Coupon.findOneAndUpdate(filtro, { $set: cambios }, { returnDocument: "after", runValidators: true })
    .lean<CuponLean>();
  if (!c) {
    throw conflicto(
      "No se puede cambiar el tipo o valor de un cupón ya usado. Desactívalo y crea otro.",
      "CUPON_EN_USO",
    );
  }
  log.info("cupon.actualizado", { codigo: c.codigo });
  return aCupon(c);
}
