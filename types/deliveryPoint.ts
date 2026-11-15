/** Punto de entrega que administra el panel (D-72). Nunca se borra: se desactiva. */
export type DeliveryPoint = {
  _id: string;
  nombre: string;
  direccion: string;
  referencia?: string;
  horario?: string;
  activo: boolean;
  orden: number;
};

/** Lo que recibe la tienda: solo puntos activos y sin campos internos. */
export type DeliveryPointPublic = Pick<DeliveryPoint, "_id" | "nombre" | "direccion" | "referencia" | "horario">;

export type DeliveryPointInput = Omit<DeliveryPoint, "_id">;

/** Copia del punto que se guarda en el pedido: editar el punto después no cambia pedidos ya hechos. */
export type PuntoEntregaCopia = { nombre: string; direccion: string; referencia?: string; horario?: string };
