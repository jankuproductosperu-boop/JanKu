import type { OrderEstado } from "@/lib/orderStatus";
import type { PuntoEntregaCopia } from "./deliveryPoint";

export type PagoEstado = "pendiente" | "pagado" | "reembolsado";
export type MetodoPago = "" | "yape" | "plin" | "transferencia" | "efectivo" | "otro";
/** "recojo" solo existe en pedidos antiguos: ya no se acepta al crear (D-72). */
export type MetodoEntrega = "delivery_huancayo" | "punto_entrega" | "envio_provincia" | "recojo";

export type OrderEntrega = {
  metodo: MetodoEntrega;
  direccion?: string;
  referencia?: string;
  ciudad?: string;
  departamento?: string;
  provincia?: string;
  /** Copia del punto de entrega al momento del pedido (solo con `punto_entrega`). */
  puntoEntrega?: PuntoEntregaCopia;
};

export type OrderItem = {
  tipo: "producto" | "promocion";
  refId: string;
  /** Solo en productos con variantes (fase 13b). */
  varianteId?: string;
  varianteEtiqueta?: string;
  nombre: string;
  codigo?: string;
  imagenUrl?: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
};

export type OrderPublic = {
  codigo: string;
  estado: OrderEstado;
  cliente: { nombre: string; telefono: string; email?: string };
  entrega: OrderEntrega;
  items: OrderItem[];
  subtotal: number;
  descuentoNivel: { nombre: string; monto: number } | null;
  cupon: { codigo: string; monto: number } | null;
  descuentoTotal: number;
  costoEnvio: number;
  envioPorCoordinar: boolean;
  total: number;
  pago: { estado: PagoEstado; metodo: MetodoPago };
  notasCliente?: string;
  historial: { estado: OrderEstado; fecha: string }[];
  createdAt: string;
};

export type Order = Omit<OrderPublic, "items" | "historial" | "pago"> & {
  _id: string;
  userId?: string;
  items: (OrderItem & { precioCosto?: number })[];
  /** Solo en la vista de administración (fase 17): nota/motivo del cambio y quién lo hizo. */
  historial: { estado: OrderEstado; fecha: string; nota?: string; adminNombre?: string }[];
  notasInternas?: string;
  stockDescontado: boolean;
  origen?: { ip?: string; userAgent?: string };
  pago: OrderPublic["pago"] & { referencia?: string; fecha?: string };
};

// Se escribe a mano (types/ no puede importar de server/). Debe coincidir con pedidoCrearSchema;
// order.schema.ts lo comprueba en tiempo de compilación.
export type OrderCreateInput = {
  /** `id` es el del producto o promoción; `varianteId` solo si el producto tiene variantes (D-63). */
  items: { id: string; varianteId?: string; cantidad: number }[];
  cliente: { nombre: string; telefono: string; email?: string };
  /**
   * Objeto plano por compatibilidad; las reglas por método las aplica pedidoCrearSchema (D-71/72/73):
   * "recojo" y los campos que no corresponden al método se rechazan con 400.
   */
  entrega: {
    metodo: MetodoEntrega;
    direccion?: string;
    referencia?: string;
    ciudad?: string;
    departamento?: string;
    provincia?: string;
    puntoEntregaId?: string;
  };
  notas?: string;
  website?: string;
};

export type OrderCreateResult = { codigo: string; token: string; total: number; whatsappUrl: string };
