import "server-only";
import crypto from "crypto";
import { connectDB } from "@/server/db";
import { AppError, entradaInvalida, noEncontrado } from "@/server/http/errors";
import { log } from "@/server/logger";
import { generarToken, hashearToken } from "@/server/auth/tokens";
import { listarNivelesActivos } from "@/server/services/discount.service";
import { redondear2 } from "@/lib/money";
import { normalizarTelefono } from "@/lib/phone";
import { calcularTotales } from "@/lib/pricing";
import { etiquetaVariante, precioDeVariante, tieneVariantes } from "@/lib/variantes";
import { enlaceWhatsAppPedido } from "@/lib/whatsapp";
import type { OrderEstado } from "@/lib/orderStatus";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Promotion from "@/models/Promotion";
import User from "@/models/User";
import type {
  MetodoEntrega,
  MetodoPago,
  OrderCreateInput,
  OrderCreateResult,
  OrderItem,
  OrderPublic,
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

// ── Crear pedido ──────────────────────────────────────────────────────────────────────────────────────

export async function crearPedido(
  datos: OrderCreateInput,
  ctx: { userId?: string; ip: string; userAgent: string },
): Promise<OrderCreateResult> {
  await connectDB();

  // 1. Unir ítems repetidos.
  const lineas = unirLineas(datos.items);

  // 2. Productos activos; los ids restantes se buscan como promociones activas.
  const ids = [...new Set(lineas.map((l) => l.id))];
  const productos = await Product.find({ _id: { $in: ids }, activo: { $ne: false } })
    .select("nombre precio codigo imagenPrincipal imagenUrl imagenes precioCosto stockCantidad opciones variantes")
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

  // 6. Totales con la misma función que el carrito (N1-5). Cupones: fase 18.
  const niveles = await listarNivelesActivos();
  const totales = calcularTotales({
    lineas: items.map((i) => ({ precio: i.precioUnitario, cantidad: i.cantidad })),
    niveles,
    costoEnvio: 0,
  });

  // 7. Envío a otra ciudad: el costo se coordina por WhatsApp.
  const envioPorCoordinar = datos.entrega.metodo === "envio_provincia";

  // 8. Código y token. El token solo se devuelve una vez; en la base queda su hash.
  const token = generarToken();
  const tokenAccesoHash = hashearToken(token);
  const telefono = normalizarTelefono(datos.cliente.telefono);
  if (!telefono) throw entradaInvalida({ "cliente.telefono": "Ingresa un celular válido de 9 dígitos" });

  const ahora = new Date();
  const base = {
    tokenAccesoHash,
    userId: ctx.userId ?? null,
    cliente: { nombre: datos.cliente.nombre, telefono, email: datos.cliente.email ?? "" },
    entrega: {
      metodo: datos.entrega.metodo,
      direccion: datos.entrega.direccion ?? "",
      referencia: datos.entrega.referencia ?? "",
      ciudad: datos.entrega.ciudad ?? "",
      departamento: datos.entrega.departamento ?? "",
    },
    items,
    subtotal: totales.subtotal,
    descuentoNivel:
      totales.nivel && totales.descuentoNivel > 0
        ? { nivelId: totales.nivel._id, nombre: totales.nivel.nombre, monto: totales.descuentoNivel }
        : null,
    cupon: null,
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

  // 9. Crear; si el código choca (muy improbable), se genera otro hasta 3 intentos en total.
  let codigo = "";
  for (let intento = 0; ; intento++) {
    codigo = generarCodigo(ahora);
    try {
      await Order.create({ ...base, codigo });
      break;
    } catch (err) {
      if (esCodigoDuplicado(err) && intento < 2) continue;
      throw err;
    }
  }

  // 10. Guardar el teléfono en la cuenta si aún no tenía. Un fallo aquí no debe perder el pedido.
  if (ctx.userId) {
    try {
      await User.updateOne({ _id: ctx.userId, telefono: { $in: ["", null] } }, { $set: { telefono } });
    } catch (err) {
      log.warn("pedido.telefono_usuario_no_guardado", { codigo, mensaje: err instanceof Error ? err.message : "error" });
    }
  }

  // 11. Sin datos personales en el log.
  log.info("pedido.creado", { codigo, total: totales.total, items: items.length });

  // 12.
  return {
    codigo,
    token,
    total: totales.total,
    whatsappUrl: enlaceWhatsAppPedido({ codigo, total: totales.total, nombre: datos.cliente.nombre }),
  };
}

// ── Lecturas ─────────────────────────────────────────────────────────────────────────────────────────────

type OrderLean = {
  codigo: string;
  estado: OrderEstado;
  cliente: { nombre: string; telefono: string; email?: string };
  entrega: { metodo: MetodoEntrega; direccion?: string; referencia?: string; ciudad?: string; departamento?: string };
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
