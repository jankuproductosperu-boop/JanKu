import type { OrderEstado } from "@/lib/orderStatus";

export type PagoEstado = "pendiente" | "pagado" | "reembolsado";
export type MetodoPago = "" | "yape" | "plin" | "transferencia" | "efectivo" | "otro";
export type MetodoEntrega = "delivery_huancayo" | "recojo" | "envio_provincia";

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
  entrega: { metodo: MetodoEntrega; direccion?: string; referencia?: string; ciudad?: string; departamento?: string };
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

export type Order = OrderPublic & {
  _id: string;
  userId?: string;
  items: (OrderItem & { precioCosto?: number })[];
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
  entrega: { metodo: MetodoEntrega; direccion?: string; referencia?: string; ciudad?: string; departamento?: string };
  notas?: string;
  website?: string;
};

export type OrderCreateResult = { codigo: string; token: string; total: number; whatsappUrl: string };
