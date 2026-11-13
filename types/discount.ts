export type TipoDescuento = "porcentaje" | "monto_fijo";
export type DiscountTier = {
  _id: string;
  nombre: string;
  montoMinimo: number;
  tipoDescuento: TipoDescuento;
  valorDescuento: number;
  activo: boolean;
};
export type DiscountTierInput = Omit<DiscountTier, "_id">;
