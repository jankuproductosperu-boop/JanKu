import "server-only";
import crypto from "crypto";
import mongoose, { isValidObjectId, type ClientSession } from "mongoose";
import { connectDB } from "@/server/db";
import { AppError, conflicto, entradaInvalida, noEncontrado } from "@/server/http/errors";
import { log } from "@/server/logger";
import { generarToken, hashearToken } from "@/server/auth/tokens";
import { listarNivelesActivos } from "@/server/services/discount.service";
import {
  asegurarColeccionesCupon,
  claveCliente,
  consumirCupon,
  evaluarCuponParaPedido,
  liberarCupon,
} from "@/server/services/coupon.service";
import { obtenerPuntoActivo } from "@/server/services/deliveryPoint.service";
import {
  asegurarColeccionMovimientos,
  descontarPorPedido,
  reponerPorPedido,
  type ItemStock,
} from "@/server/services/inventory.service";
import { redondear2 } from "@/lib/money";
import { normalizarTelefono } from "@/lib/phone";
import { calcularTotales, type Linea } from "@/lib/pricing";
import { entregaGratis } from "@/lib/shipping";
import { etiquetaVariante, precioDeVariante, tieneVariantes } from "@/lib/variantes";
import { enlaceWhatsAppPedido } from "@/lib/whatsapp";
import { puedeTransicionar, type OrderEstado } from "@/lib/orderStatus";
import AdminUser from "@/models/AdminUser";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Promotion from "@/models/Promotion";
import User from "@/models/User";
import type {
  MetodoEntrega,
  MetodoPago,
  OrderCreateInput,
  OrderCreateResult,
  Order as PedidoAdmin,
  OrderItem,
  OrderPublic,
  Paginated,
  PagoEstado,
} from "@/types";

const MAX_POR_ITEM = 99;
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// ── Códigos y tokens ────────────────────────────────────────────────────────────────────────────

/** "JK-AAMMDD-XXXX": fecha en America/Lima + 4 caracteres sin ambigüedades (sin 0, 1, I, O). */
function generarCodigo(ahora = new Date()): string {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(ahora)
    .split("-");
  let sufijo = "";
  for (let i = 0; i < 4; i++) sufijo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return `JK-${anio.slice(2)}${mes}${dia}-${sufijo}`;
}

function esCodigoDuplicado(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; keyPattern?: Record<string, unknown> };
  return e.code === 11000 && e.keyPattern !== undefined && "codigo" in e.keyPattern;
}

function hashesIguales(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// ── Lecturas de catálogo (solo los campos necesarios) ─────────────────────────────────────────────

type VarianteLean = {
  _id: unknown;
  combinacion: Record<string, string>;
  stockCantidad?: number;
  precio?: number | null;
  imagen?: string;
  activo?: boolean;
};
type ProductoLean = {
  _id: unknown;
  nombre: string;
  precio: number;
  codigo?: string;
  imagenPrincipal?: string;
  imagenUrl?: string;
  imagenes?: string[];
  precioCosto?: number;
  stockCantidad?: number | null;
  deliveryHuancayo?: boolean | null;
  opciones?: { nombre: string }[];
  variantes?: VarianteLean[];
};
type PromocionLean = { _id: unknown; titulo: string; precio: number; imagenUrl?: string; stock?: string };

type LineaPedido = { clave: string; id: string; varianteId?: string; cantidad: number };
type ItemConCosto = OrderItem & { precioCosto: number };

const sinCantidad = (hay: number) => (hay <= 0 ? "Agotado" : "No hay suficiente stock");

/** Une líneas con el mismo producto y la misma variante (paso 1). */
function unirLineas(items: OrderCreateInput["items"]): LineaPedido[] {
  const porClave = new Map<string, LineaPedido>();
  for (const it of items) {
    const clave = it.varianteId ? `${it.id}:${it.varianteId}` : it.id;
    const previa = porClave.get(clave);
    if (previa) previa.cantidad += it.cantidad;
    else porClave.set(clave, { clave, id: it.id, varianteId: it.varianteId, cantidad: it.cantidad });
  }
  const lineas = [...porClave.values()];
  const excedidas: Record<string, string> = {};
  for (const l of lineas) {
    if (l.cantidad > MAX_POR_ITEM) excedidas[l.clave] = `Máximo ${MAX_POR_ITEM} unidades`;
  }
  if (Object.keys(excedidas).length) throw entradaInvalida(excedidas);
  return lineas;
}

// ── Resolver ítems (pasos 1-5) ─────────────────────────────────────────────────────────────────────────

export type ItemPedido = ItemConCosto;
/** Solo para D-71: si el carrito califica al delivery gratis. No se guarda en el pedido. */
export type ItemParaEnvio = { tipo: "producto" | "promocion"; deliveryHuancayo?: boolean | null };

/**
 * Une, resuelve contra la base, comprueba disponibilidad y construye los ítems. Precios SIEMPRE de la base
 * (N1-5). Lo usan crearPedido y POST /api/coupons/validate. `paraEnvio` lo añade la fase 16b (D-71).
 */
export async function resolverItems(
  itemsEntrada: OrderCreateInput["items"],
): Promise<{ items: ItemPedido[]; lineas: Linea[]; paraEnvio: ItemParaEnvio[] }> {
  await connectDB();

  // 1. Unir ítems repetidos.
  const lineas = unirLineas(itemsEntrada);

  // 2. Productos activos; los ids restantes se buscan como promociones activas.
  const ids = [...new Set(lineas.map((l) => l.id))];
  const productos = await Product.find({ _id: { $in: ids }, activo: { $ne: false } })
    .select("nombre precio codigo imagenPrincipal imagenUrl imagenes precioCosto stockCantidad deliveryHuancayo opciones variantes")
    .lean<ProductoLean[]>();
  const porProducto = new Map(productos.map((p) => [String(p._id), p]));

  const restantes = ids.filter((id) => !porProducto.has(id));
  const promos = restantes.length
    ? await Promotion.find({ _id: { $in: restantes }, activo: true })
        .select("titulo precio imagenUrl stock")
        .lean<PromocionLean[]>()
    : [];
  const porPromocion = new Map(promos.map((p) => [String(p._id), p]));

  // 3-5. Validar cada línea y construir los ítems con datos de la base.
  const invalidos: Record<string, string> = {};
  const noDisponibles: Record<string, string> = {};
  const sinStock: Record<string, string> = {};
  const items: ItemConCosto[] = [];
  const paraEnvio: ItemParaEnvio[] = [];

  for (const l of lineas) {
    const producto = porProducto.get(l.id);
    const promo = porPromocion.get(l.id);

    if (producto) {
      const conVariantes = tieneVariantes(producto);
      if (conVariantes && !l.varianteId) {
        invalidos[l.clave] = "Elige una variante";
        continue;
      }
      if (!conVariantes && l.varianteId) {
        invalidos[l.clave] = "Este producto no tiene variantes";
        continue;
      }

      const variante = l.varianteId
        ? (producto.variantes ?? []).find((v) => String(v._id) === l.varianteId)
        : undefined;
      if (l.varianteId && (!variante || variante.activo === false)) {
        noDisponibles[l.clave] = "No disponible";
        continue;
      }

      const precio = precioDeVariante(producto.precio, variante);
      if (!Number.isFinite(precio) || precio < 0) {
        noDisponibles[l.clave] = "No disponible";
        continue;
      }

      const hay = (variante ? variante.stockCantidad : producto.stockCantidad) ?? 0;
      if (hay < l.cantidad) {
        sinStock[l.clave] = sinCantidad(hay);
        continue;
      }

      const orden = (producto.opciones ?? []).map((o) => o.nombre);
      items.push({
        tipo: "producto",
        refId: l.id,
        ...(variante ? { varianteId: l.varianteId, varianteEtiqueta: etiquetaVariante(variante.combinacion, orden) } : {}),
        nombre: producto.nombre,
        codigo: producto.codigo ?? "",
        // Se guarda tal como está en la base (public_id o URL); no se unifican generadores de URL.
        imagenUrl: variante?.imagen || producto.imagenPrincipal || producto.imagenUrl || producto.imagenes?.[0] || "",
        precioUnitario: precio,
        cantidad: l.cantidad,
        subtotal: redondear2(precio * l.cantidad),
        precioCosto: producto.precioCosto ?? 0,
      });
      paraEnvio.push({ tipo: "producto", deliveryHuancayo: producto.deliveryHuancayo });
      continue;
    }

    if (promo) {
      if (l.varianteId) {
        invalidos[l.clave] = "Las promociones no tienen variantes";
        continue;
      }
      if (promo.stock === "Agotado") {
        sinStock[l.clave] = "Agotado";
        continue;
      }
      if (!Number.isFinite(promo.precio) || promo.precio < 0) {
        noDisponibles[l.clave] = "No disponible";
        continue;
      }
      items.push({
        tipo: "promocion",
        refId: l.id,
        nombre: promo.titulo,
        codigo: "",
        imagenUrl: promo.imagenUrl ?? "",
        precioUnitario: promo.precio,
        cantidad: l.cantidad,
        subtotal: redondear2(promo.precio * l.cantidad),
        precioCosto: 0,
      });
      paraEnvio.push({ tipo: "promocion" }); // las promociones nunca cuentan como delivery gratis
      continue;
    }

    noDisponibles[l.clave] = "No disponible";
  }

  if (Object.keys(invalidos).length) throw entradaInvalida(invalidos);
  if (Object.keys(noDisponibles).length) {
    throw new AppError(409, "Algunos productos ya no están disponibles", "ITEMS_NO_DISPONIBLES", noDisponibles);
  }
  // D-68: el error público no revela cantidades.
  if (Object.keys(sinStock).length) throw new AppError(409, "No hay stock suficiente", "SIN_STOCK", sinStock);

  return {
    items,
    lineas: items.map((i) => ({ precio: i.precioUnitario, cantidad: i.cantidad })),
    paraEnvio,
  };
}

// ── Crear pedido ──────────────────────────────────────────────────────────────────────────────────────

export async function crearPedido(
  datos: OrderCreateInput,
  ctx: { userId?: string; ip: string; userAgent: string },
): Promise<OrderCreateResult> {
  await connectDB();

  // 1-5. Ítems con datos de la base.
  const { items, lineas, paraEnvio } = await resolverItems(datos.items);

  // 6. Totales con la misma función que el carrito (N1-5). Sin cupón; si hay cupón se recalculan en el paso 8.
  const niveles = await listarNivelesActivos();
  let totales = calcularTotales({ lineas, niveles, costoEnvio: 0 });

  // 7. Entrega (D-71/72/73). Lo decide el servidor con datos de la base (N1-5); el costo nunca llega del navegador.
  const metodo = datos.entrega.metodo;
  if (metodo === "recojo") {
    // El esquema ya lo rechaza; se repite aquí por si alguien llama al servicio sin validar.
    throw entradaInvalida({ "entrega.metodo": "Este método de entrega ya no está disponible" });
  }
  let puntoEntrega: { puntoId: string; nombre: string; direccion: string; referencia: string; horario: string } | null =
    null;
  if (metodo === "punto_entrega") {
    const punto = datos.entrega.puntoEntregaId ? await obtenerPuntoActivo(datos.entrega.puntoEntregaId) : null;
    if (!punto) {
      throw new AppError(409, "El punto de entrega ya no está disponible", "PUNTO_NO_DISPONIBLE", {
        "entrega.puntoEntregaId": "Elige otro punto de entrega",
      });
    }
    puntoEntrega = {
      puntoId: punto._id,
      nombre: punto.nombre,
      direccion: punto.direccion,
      referencia: punto.referencia ?? "",
      horario: punto.horario ?? "",
    };
  }
  // Delivery en Huancayo: gratis si algún producto lo tiene; si no, el adicional se coordina por WhatsApp.
  // Punto de entrega: sin costo ni aviso. Envío a provincia: siempre por coordinar.
  const envioPorCoordinar =
    metodo === "envio_provincia" ? true : metodo === "delivery_huancayo" ? !entregaGratis(paraEnvio) : false;

  const entrega =
    metodo === "delivery_huancayo"
      ? { metodo, direccion: datos.entrega.direccion ?? "", referencia: datos.entrega.referencia ?? "" }
      : metodo === "envio_provincia"
        ? {
            metodo,
            departamento: datos.entrega.departamento ?? "",
            provincia: datos.entrega.provincia ?? "",
            ciudad: datos.entrega.ciudad ?? "",
          }
        : { metodo, puntoEntrega };

  const telefono = normalizarTelefono(datos.cliente.telefono);
  if (!telefono) throw entradaInvalida({ "cliente.telefono": "Ingresa un celular válido de 9 dígitos" });

  // 8. Cupón (fase 18, D-38 a D-43). Un cupón inválido NO crea el pedido: el cliente decide si sigue sin él.
  let cupon: { couponId: string; codigo: string; monto: number } | null = null;
  let clienteKey: string | null = null;
  if (datos.cupon) {
    // Siempre hay clave: el teléfono es obligatorio y ya está validado.
    clienteKey = claveCliente({ userId: ctx.userId, telefono });
    const ev = await evaluarCuponParaPedido({ codigo: datos.cupon, lineas, clienteKey, niveles });
    const r = ev.resultado;
    if (!r.valido) throw conflicto(r.mensaje, "CUPON_" + r.motivo.toUpperCase());
    // "nivel": el descuento por monto es mayor; el pedido se crea sin cupón y no se consume.
    if (r.aplicado !== "nivel" && ev.couponId && ev.codigo && ev.totales) {
      totales = ev.totales;
      cupon = { couponId: ev.couponId, codigo: ev.codigo, monto: r.descuentoCupon };
    }
  }
  // El nivel solo queda guardado si de verdad se aplicó: sin cupón ("nivel") o acumulado ("ambos").
  const nivelAplicado = totales.aplicado === "nivel" || totales.aplicado === "ambos";

  // 9. Código y token. El token solo se devuelve una vez; en la base queda su hash.
  const token = generarToken();
  const tokenAccesoHash = hashearToken(token);

  const ahora = new Date();
  const base = {
    tokenAccesoHash,
    userId: ctx.userId ?? null,
    cliente: { nombre: datos.cliente.nombre, telefono, email: datos.cliente.email ?? "" },
    entrega,
    items,
    subtotal: totales.subtotal,
    descuentoNivel:
      nivelAplicado && totales.nivel && totales.descuentoNivel > 0
        ? { nivelId: totales.nivel._id, nombre: totales.nivel.nombre, monto: totales.descuentoNivel }
        : null,
    cupon,
    descuentoTotal: totales.descuentoTotal,
    costoEnvio: totales.costoEnvio,
    envioPorCoordinar,
    total: totales.total,
    estado: "pendiente" as OrderEstado,
    pago: { estado: "pendiente" as PagoEstado, metodo: "" as MetodoPago },
    stockDescontado: false,
    notasCliente: datos.notas ?? "",
    historial: [{ estado: "pendiente" as OrderEstado, fecha: ahora }],
    origen: { ip: ctx.ip, userAgent: ctx.userAgent.slice(0, 200) },
  };

  // 10. Crear; si el código choca (muy improbable), se genera otro hasta 3 intentos en total.
  // Con cupón: pedido y consumo en UNA transacción; si consumirCupon lanza, no queda ni pedido ni consumo.
  if (cupon) await asegurarColeccionesCupon();
  let codigo = "";
  for (let intento = 0; ; intento++) {
    codigo = generarCodigo(ahora);
    try {
      if (cupon && clienteKey) {
        const c = cupon;
        const k = clienteKey;
        const orderId = new mongoose.Types.ObjectId();
        const doc = { ...base, _id: orderId, codigo };
        await conTransaccion(async (s) => {
          await Order.create([doc], { session: s });
          await consumirCupon({ couponId: c.couponId, orderId: String(orderId), clienteKey: k, monto: c.monto, session: s });
        });
      } else {
        await Order.create({ ...base, codigo });
      }
      break;
    } catch (err) {
      if (esCodigoDuplicado(err) && intento < 2) continue;
      throw err;
    }
  }

  // 11. Guardar el teléfono en la cuenta si aún no tenía. Un fallo aquí no debe perder el pedido.
  if (ctx.userId) {
    try {
      await User.updateOne({ _id: ctx.userId, telefono: { $in: ["", null] } }, { $set: { telefono } });
    } catch (err) {
      log.warn("pedido.telefono_usuario_no_guardado", { codigo, mensaje: err instanceof Error ? err.message : "error" });
    }
  }

  // 12. Sin datos personales en el log.
  log.info("pedido.creado", { codigo, total: totales.total, items: items.length, cupon: cupon?.codigo ?? "" });

  // 13.
  return {
    codigo,
    token,
    total: totales.total,
    whatsappUrl: enlaceWhatsAppPedido({ codigo, total: totales.total, nombre: datos.cliente.nombre }),
    cuponAplicado: cupon !== null,
  };
}

// ── Lecturas ─────────────────────────────────────────────────────────────────────────────────────────────

type OrderLean = {
  codigo: string;
  estado: OrderEstado;
  cliente: { nombre: string; telefono: string; email?: string };
  entrega: {
    metodo: MetodoEntrega;
    direccion?: string;
    referencia?: string;
    ciudad?: string;
    departamento?: string;
    provincia?: string;
    puntoEntrega?: { puntoId?: unknown; nombre?: string; direccion?: string; referencia?: string; horario?: string } | null;
  };
  items: {
    tipo: "producto" | "promocion";
    refId: unknown;
    varianteId?: unknown;
    varianteEtiqueta?: string;
    nombre: string;
    codigo?: string;
    imagenUrl?: string;
    precioUnitario: number;
    cantidad: number;
    subtotal: number;
  }[];
  subtotal: number;
  descuentoNivel?: { nombre: string; monto: number } | null;
  cupon?: { codigo: string; monto: number } | null;
  descuentoTotal: number;
  costoEnvio: number;
  envioPorCoordinar: boolean;
  total: number;
  pago: { estado: PagoEstado; metodo?: MetodoPago };
  notasCliente?: string;
  historial: { estado: OrderEstado; fecha: Date }[];
  userId?: unknown;
  tokenAccesoHash?: string;
  createdAt: Date;
};

/** Lista blanca explícita: solo estos campos salen por la API pública. */
function aPublico(o: OrderLean): OrderPublic {
  return {
    codigo: o.codigo,
    estado: o.estado,
    cliente: { nombre: o.cliente.nombre, telefono: o.cliente.telefono, email: o.cliente.email || undefined },
    entrega: {
      metodo: o.entrega.metodo,
      direccion: o.entrega.direccion || undefined,
      referencia: o.entrega.referencia || undefined,
      ciudad: o.entrega.ciudad || undefined,
      departamento: o.entrega.departamento || undefined,
      provincia: o.entrega.provincia || undefined,
      // Copia guardada en el pedido; el id interno del punto no sale.
      puntoEntrega: o.entrega.puntoEntrega?.nombre
        ? {
            nombre: o.entrega.puntoEntrega.nombre,
            direccion: o.entrega.puntoEntrega.direccion ?? "",
            referencia: o.entrega.puntoEntrega.referencia || undefined,
            horario: o.entrega.puntoEntrega.horario || undefined,
          }
        : undefined,
    },
    items: o.items.map((i) => ({
      tipo: i.tipo,
      refId: String(i.refId),
      varianteId: i.varianteId ? String(i.varianteId) : undefined,
      varianteEtiqueta: i.varianteEtiqueta || undefined,
      nombre: i.nombre,
      codigo: i.codigo || undefined,
      imagenUrl: i.imagenUrl || undefined,
      precioUnitario: i.precioUnitario,
      cantidad: i.cantidad,
      subtotal: i.subtotal,
    })),
    subtotal: o.subtotal,
    descuentoNivel: o.descuentoNivel ? { nombre: o.descuentoNivel.nombre, monto: o.descuentoNivel.monto } : null,
    cupon: o.cupon ? { codigo: o.cupon.codigo, monto: o.cupon.monto } : null,
    descuentoTotal: o.descuentoTotal,
    costoEnvio: o.costoEnvio,
    envioPorCoordinar: o.envioPorCoordinar,
    total: o.total,
    pago: { estado: o.pago.estado, metodo: o.pago.metodo ?? "" },
    notasCliente: o.notasCliente || undefined,
    historial: o.historial.map((h) => ({ estado: h.estado, fecha: h.fecha.toISOString() })),
    createdAt: o.createdAt.toISOString(),
  };
}

/**
 * Acceso por token (enlace del pedido) o por ser el dueño con sesión.
 * "No existe" y "sin acceso" responden exactamente lo mismo.
 */
export async function obtenerPedidoPublico(
  codigo: string,
  acceso: { token?: string; userId?: string },
): Promise<OrderPublic> {
  await connectDB();
  if (!/^[A-Za-z0-9-]{4,20}$/.test(codigo)) throw noEncontrado("Pedido");

  const hashRecibido = acceso.token ? hashearToken(acceso.token.slice(0, 256)) : null;
  const o = await Order.findOne({ codigo: codigo.toUpperCase() })
    .select("+tokenAccesoHash")
    .lean<OrderLean>();

  const porToken = !!o && !!hashRecibido && !!o.tokenAccesoHash && hashesIguales(hashRecibido, o.tokenAccesoHash);
  const porDueno = !!o && !!acceso.userId && !!o.userId && String(o.userId) === acceso.userId;
  if (!o || (!porToken && !porDueno)) throw noEncontrado("Pedido");
  return aPublico(o);
}

export async function listarPedidosDeUsuario(userId: string): Promise<OrderPublic[]> {
  await connectDB();
  const docs = await Order.find({ userId }).sort({ createdAt: -1 }).limit(50).lean<OrderLean[]>();
  return docs.map(aPublico);
}

// ── Administración de pedidos (fase 17) ───────────────────────────────────────────────────────────────

type Actor = { adminId: string };

type OrderAdminLean = Omit<OrderLean, "items" | "pago" | "historial"> & {
  _id: unknown;
  items: (OrderLean["items"][number] & { precioCosto?: number })[];
  pago: OrderLean["pago"] & { referencia?: string; fecha?: Date | null };
  historial: { estado: OrderEstado; fecha: Date; adminId?: unknown; nota?: string }[];
  notasInternas?: string;
  stockDescontado?: boolean;
  origen?: { ip?: string; userAgent?: string };
};

async function nombresDeAdmins(ids: unknown[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean).map(String))];
  if (!unicos.length) return new Map();
  const admins = await AdminUser.find({ _id: { $in: unicos } })
    .select("nombre")
    .lean<{ _id: unknown; nombre?: string }[]>();
  return new Map(admins.map((a) => [String(a._id), a.nombre ?? ""]));
}

function aAdmin(
  o: OrderAdminLean,
  opts: { incluirCostos: boolean; incluirOrigen: boolean; nombres?: Map<string, string> },
): PedidoAdmin {
  const base = aPublico({ ...o, historial: o.historial.map((h) => ({ estado: h.estado, fecha: h.fecha })) });
  return {
    ...base,
    _id: String(o._id),
    userId: o.userId ? String(o.userId) : undefined,
    // El costo solo sale si quien pide tiene `costos.ver`.
    items: base.items.map((it, i) => (opts.incluirCostos ? { ...it, precioCosto: o.items[i].precioCosto ?? 0 } : it)),
    historial: o.historial.map((h) => ({
      estado: h.estado,
      fecha: h.fecha.toISOString(),
      nota: h.nota || undefined,
      adminNombre: h.adminId ? opts.nombres?.get(String(h.adminId)) || undefined : undefined,
    })),
    notasInternas: o.notasInternas || undefined,
    stockDescontado: o.stockDescontado === true,
    origen: opts.incluirOrigen ? o.origen : undefined,
    pago: {
      ...base.pago,
      referencia: o.pago.referencia || undefined,
      fecha: o.pago.fecha ? o.pago.fecha.toISOString() : undefined,
    },
  };
}

/** Quita el costo de los ítems (para quien no tiene `costos.ver`). */
export function sinCostos(p: PedidoAdmin): PedidoAdmin {
  return { ...p, items: p.items.map((it) => ({ ...it, precioCosto: undefined })) };
}

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listarPedidosAdmin(q: {
  estado?: OrderEstado;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<PedidoAdmin>> {
  await connectDB();
  const filtro: Record<string, unknown> = {};
  if (q.estado) filtro.estado = q.estado;

  const texto = (q.q ?? "").trim();
  if (texto) {
    // Todo lo que llega del navegador se escapa antes de armar la expresión regular.
    const condiciones: Record<string, unknown>[] = [
      { codigo: { $regex: `^${escaparRegex(texto.toUpperCase())}` } },
      { "cliente.nombre": { $regex: escaparRegex(texto), $options: "i" } },
    ];
    const digitos = texto.replace(/\D/g, "");
    if (digitos.length >= 3) condiciones.push({ "cliente.telefono": { $regex: digitos } });
    filtro.$or = condiciones;
  }

  const [docs, total] = await Promise.all([
    Order.find(filtro)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean<OrderAdminLean[]>(),
    Order.countDocuments(filtro),
  ]);
  // La lista nunca lleva costos ni origen.
  const items = docs.map((d) => aAdmin(d, { incluirCostos: false, incluirOrigen: false }));
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function obtenerPedidoAdmin(id: string, opts: { incluirCostos: boolean }): Promise<PedidoAdmin> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Pedido");
  const o = await Order.findById(id).lean<OrderAdminLean>();
  if (!o) throw noEncontrado("Pedido");
  const nombres = await nombresDeAdmins(o.historial.map((h) => h.adminId));
  return aAdmin(o, { incluirCostos: opts.incluirCostos, incluirOrigen: true, nombres });
}

/** Abre una transacción y la reintenta solo ante conflictos transitorios; `fn` debe poder repetirse. */
async function conTransaccion<T>(fn: (s: ClientSession) => Promise<T>): Promise<T> {
  await connectDB();
  await asegurarColeccionMovimientos();
  const session = await mongoose.startSession();
  try {
    let resultado: { valor: T } | undefined;
    await session.withTransaction(async () => {
      resultado = { valor: await fn(session) };
    });
    if (!resultado) throw new Error("La transacción del pedido no devolvió resultado");
    return resultado.valor;
  } finally {
    await session.endSession();
  }
}

type PedidoParaCambio = {
  codigo: string;
  estado: OrderEstado;
  stockDescontado?: boolean;
  items: { tipo: "producto" | "promocion"; refId: unknown; varianteId?: unknown; nombre: string; cantidad: number }[];
  cupon?: { couponId?: unknown } | null;
};

function itemsConStock(p: PedidoParaCambio): ItemStock[] {
  return p.items
    .filter((i) => i.tipo === "producto") // las promociones no llevan stock (D-23)
    .map((i) => ({
      productId: String(i.refId),
      variantId: i.varianteId ? String(i.varianteId) : undefined,
      cantidad: i.cantidad,
      nombre: i.nombre,
    }));
}

/**
 * Cambio de estado: estado, historial y stock en UNA transacción. El filtro por el estado anterior
 * impide que dos administradores apliquen la misma acción a la vez.
 */
async function cambiarEstado(
  id: string,
  destino: OrderEstado,
  opts: {
    actor: Actor | null;
    nota?: string;
    /** Efectos de inventario; devuelve el nuevo valor de `stockDescontado` si cambia. */
    inventario?: (p: PedidoParaCambio, s: ClientSession) => Promise<boolean | undefined>;
  },
): Promise<PedidoAdmin> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Pedido");

  const codigo = await conTransaccion(async (s) => {
    const p = await Order.findById(id).select("codigo estado stockDescontado items cupon").session(s).lean<PedidoParaCambio>();
    if (!p) throw noEncontrado("Pedido");
    if (!puedeTransicionar(p.estado, destino)) {
      throw conflicto(`No se puede pasar el pedido de «${p.estado}» a «${destino}»`, "TRANSICION_INVALIDA");
    }

    const stockDescontado = opts.inventario ? await opts.inventario(p, s) : undefined;

    const res = await Order.updateOne(
      { _id: id, estado: p.estado },
      {
        $set: { estado: destino, ...(stockDescontado !== undefined ? { stockDescontado } : {}) },
        $push: {
          historial: {
            estado: destino,
            fecha: new Date(),
            ...(opts.actor ? { adminId: opts.actor.adminId } : {}),
            ...(opts.nota ? { nota: opts.nota } : {}),
          },
        },
      },
    ).session(s);
    if (res.modifiedCount !== 1) {
      throw conflicto("El pedido cambió mientras lo editabas. Recarga.", "PEDIDO_MODIFICADO");
    }
    return p.codigo;
  });

  log.info("pedido.estado", { codigo, estado: destino, adminId: opts.actor?.adminId ?? "sistema" });
  return obtenerPedidoAdmin(id, { incluirCostos: true });
}

export function confirmarPedido(id: string, actor: Actor): Promise<PedidoAdmin> {
  return cambiarEstado(id, "confirmado", {
    actor,
    inventario: async (p, s) => {
      if (p.stockDescontado) return undefined; // ya descontado: nunca dos veces
      await descontarPorPedido({
        items: itemsConStock(p),
        codigo: p.codigo,
        orderId: id,
        actor,
        session: s,
      });
      return true;
    },
  });
}

export function marcarEnviado(id: string, actor: Actor, nota?: string): Promise<PedidoAdmin> {
  return cambiarEstado(id, "enviado", { actor, nota: nota || undefined });
}

export function marcarEntregado(id: string, actor: Actor): Promise<PedidoAdmin> {
  return cambiarEstado(id, "entregado", { actor });
}

/** `actor` null = el sistema (caducidad). */
export function cancelarPedido(id: string, actor: Actor | null, motivo: string): Promise<PedidoAdmin> {
  return cambiarEstado(id, "cancelado", {
    actor,
    nota: motivo,
    inventario: async (p, s) => {
      // Fase 18: el cupón se libera en la misma transacción que el cambio de estado.
      if (p.cupon) await liberarCupon({ orderId: id, session: s });
      if (!p.stockDescontado) return undefined; // nada que devolver
      await reponerPorPedido({
        items: itemsConStock(p),
        codigo: p.codigo,
        orderId: id,
        actor: actor ?? undefined,
        session: s,
      });
      return false;
    },
  });
}

export async function registrarPago(
  id: string,
  actor: Actor,
  pago: { estado: PagoEstado; metodo: MetodoPago; referencia?: string },
): Promise<PedidoAdmin> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Pedido");
  const o = await Order.findById(id).select("codigo pago").lean<{ codigo: string; pago: { estado: PagoEstado } }>();
  if (!o) throw noEncontrado("Pedido");

  const set: Record<string, unknown> = {
    "pago.estado": pago.estado,
    "pago.metodo": pago.metodo,
    "pago.referencia": pago.referencia ?? "",
  };
  if (pago.estado === "pagado" && o.pago.estado !== "pagado") set["pago.fecha"] = new Date();
  if (pago.estado === "pendiente") set["pago.fecha"] = null;

  await Order.updateOne({ _id: id }, { $set: set });
  log.info("pedido.pago", { codigo: o.codigo, pago: pago.estado, adminId: actor.adminId });
  return obtenerPedidoAdmin(id, { incluirCostos: true });
}

const LIMITE_NOTAS = 2000; // maxlength de `notasInternas` en el modelo

/** AÑADE una línea `[fecha · admin] texto`; nunca reemplaza lo anterior. */
export async function agregarNota(id: string, actor: Actor, nota: string): Promise<PedidoAdmin> {
  await connectDB();
  if (!isValidObjectId(id)) throw noEncontrado("Pedido");
  const o = await Order.findById(id).select("codigo notasInternas").lean<{ codigo: string; notasInternas?: string }>();
  if (!o) throw noEncontrado("Pedido");

  const nombres = await nombresDeAdmins([actor.adminId]);
  const fecha = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const linea = `[${fecha} · ${nombres.get(actor.adminId) || "admin"}] ${nota}`;
  const previo = o.notasInternas ?? "";
  const nuevo = previo ? `${previo}\n${linea}` : linea;
  if (nuevo.length > LIMITE_NOTAS) {
    throw conflicto(`Las notas internas llegaron al límite de ${LIMITE_NOTAS} caracteres`, "NOTAS_LLENAS");
  }

  // Solo se escribe si nadie añadió otra nota entretanto (no se pierden notas ajenas).
  const res = await Order.updateOne(
    { _id: id, notasInternas: previo === "" ? { $in: ["", null] } : previo },
    { $set: { notasInternas: nuevo } },
  );
  if (res.modifiedCount !== 1) {
    throw conflicto("El pedido cambió mientras lo editabas. Recarga.", "PEDIDO_MODIFICADO");
  }
  log.info("pedido.nota", { codigo: o.codigo, adminId: actor.adminId });
  return obtenerPedidoAdmin(id, { incluirCostos: true });
}

const HORAS_CADUCIDAD = 72;

/** Cancela (como sistema) los pedidos pendientes de más de 72 h; un fallo en uno no detiene los demás. */
export async function caducarPendientes(): Promise<{ cancelados: number }> {
  await connectDB();
  const limite = new Date(Date.now() - HORAS_CADUCIDAD * 60 * 60 * 1000);
  const viejos = await Order.find({ estado: "pendiente", createdAt: { $lt: limite } })
    .sort({ createdAt: 1 })
    .limit(100)
    .select("_id")
    .lean<{ _id: unknown }[]>();

  let cancelados = 0;
  for (const v of viejos) {
    try {
      await cancelarPedido(String(v._id), null, `Caducado: sin confirmar en ${HORAS_CADUCIDAD} h`);
      cancelados++;
    } catch (err) {
      log.warn("pedido.caducidad_fallo", { id: String(v._id), mensaje: err instanceof Error ? err.message : "error" });
    }
  }
  return { cancelados };
}
