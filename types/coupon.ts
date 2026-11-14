// Datos mínimos de un cupón para calcular su descuento (lib/pricing.ts). El modelo completo llega en la fase 18.
export type CuponAplicable = {
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  topeDescuento?: number | null;
  montoMinimo: number;
  acumulable: boolean;
};
