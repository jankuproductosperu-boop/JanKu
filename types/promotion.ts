import type { StockEstado } from "./product";

export type PromotionEtiqueta = "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo";
export type Promotion = {
  _id: string;
  titulo: string;
  descripcion?: string;
  descripcionCompleta?: string;
  precio: number;
  precioAnterior?: number;
  imagenUrl: string;
  imagenesAdicionales?: string[];
  tipoEtiqueta: PromotionEtiqueta;
  stock: StockEstado;
  activo: boolean;
  orden: number;
  whatsappLink?: string;
  whatsappNumero?: string;
  caracteristicas?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
};
export type PromotionInput = Omit<Promotion, "_id">;
