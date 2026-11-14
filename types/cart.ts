export type CartItemTipo = "producto" | "promocion";
export type CartItem = {
  _id: string;
  nombre: string;
  precio: number;
  imagenUrl?: string;
  slug?: string;
  codigoUrl?: string;
  cantidad: number;
  tipo?: CartItemTipo;
  varianteId?: string;
  varianteEtiqueta?: string;
};
