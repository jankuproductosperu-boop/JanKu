export type StockMovimientoTipo = "entrada" | "salida" | "ajuste" | "pedido" | "devolucion";

export type StockMovement = {
  _id: string;
  productId: string;
  tipo: StockMovimientoTipo;
  cantidad: number; // con signo: positivo suma, negativo resta
  stockAntes: number;
  stockDespues: number;
  motivo?: string;
  orderId?: string;
  adminId?: string;
  adminNombre?: string;
  createdAt: string;
};
