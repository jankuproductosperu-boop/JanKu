// Datos mínimos de un cupón para calcular su descuento (lib/pricing.ts).
export type CuponAplicable = {
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  topeDescuento?: number | null;
  montoMinimo: number;
  acumulable: boolean;
};

export type CouponMotivo = "no_valido" | "no_alcanza_minimo" | "ya_usado";

/** Cupón tal como lo ve el panel (fase 18). Fechas como texto ISO. */
export type Coupon = {
  _id: string;
  codigo: string;
  descripcion: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  topeDescuento: number | null;
  montoMinimo: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  usosMaximos: number | null;
  usosPorCliente: number;
  usosActuales: number;
  acumulable: boolean;
  activo: boolean;
  creadoPor?: string;
  createdAt: string;
  updatedAt: string;
};

/** Lo que el panel puede escribir. `usosActuales` y `creadoPor` nunca llegan desde fuera. */
export type CouponInput = {
  codigo: string;
  descripcion?: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  topeDescuento?: number | null;
  montoMinimo: number;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  usosMaximos?: number | null;
  usosPorCliente: number;
  acumulable: boolean;
  activo: boolean;
};

export type CouponValidateResult =
  | {
      valido: true;
      codigo: string;
      aplicado: "cupon" | "ambos" | "nivel";
      descuentoCupon: number;
      descuentoNivel: number;
      descuentoTotal: number;
      total: number;
      mensaje: string;
    }
  | { valido: false; motivo: CouponMotivo; mensaje: string };
