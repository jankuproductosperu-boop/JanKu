export type StockEstado = "Disponible" | "Limitado" | "Agotado";

/** Eje libre de variantes, p. ej. { nombre: "Color", valores: ["Negro", "Rosado"] } (D-60). */
export type ProductoOpcion = { nombre: string; valores: string[] };

/** Variante completa, tal como la ve el panel. */
export type ProductoVariante = {
  _id: string; // id estable: lo usan carrito, pedidos y movimientos
  combinacion: Record<string, string>; // { Color: "Negro", Talla: "M" }
  stockCantidad: number;
  precio?: number; // si falta, hereda el del producto
  imagen?: string; // public_id de Cloudinary, uno de los del producto
  sku?: string;
  activo: boolean;
};

/** Variante en la tienda: sin cantidad exacta ni sku (D-68); solo activas; etiqueta calculada en el servidor. */
export type ProductoVariantePublica = Omit<ProductoVariante, "stockCantidad" | "sku"> & { stock: StockEstado };

export type Product = {
  _id: string;
  nombre: string;
  precio: number;
  slug?: string;
  codigoUrl?: string;
  descripcion?: string;
  descripcionCompleta?: string;
  categorias?: string[];
  categoria?: string; // heredado (singular)
  categoriaSlug?: string; // heredado (singular)
  categoriaSlugs?: string[];
  stock?: StockEstado;
  imagenes?: string[]; // public_id de Cloudinary
  imagenPrincipal?: string; // public_id de la portada
  imagenUrl?: string; // URL completa (heredado, se sigue guardando)
  imagenesAdicionales?: string[];
  videoUrl?: string;
  deliveryHuancayo?: boolean;
  mostrarEnHome?: boolean;
  nuevoHasta?: string | null; // ISO; ver lib/novedades.ts
  envioGratis?: boolean;
  whatsappLink?: string;
  whatsappNumero?: string;
  caracteristicas?: string[];
  garantia?: string;
  tags?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
  codigo?: string;
  activo?: boolean;
  opciones?: ProductoOpcion[];
  variantes?: ProductoVariantePublica[];
  ordenHome?: number;
  ordenPorCategoria?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
};

// La cantidad exacta de stock solo la ve el panel (D-68).
export type ProductAdmin = Omit<Product, "variantes"> & {
  precioCosto?: number;
  proveedor?: string;
  stockCantidad?: number;
  stockMinimo?: number;
  variantes?: ProductoVariante[];
};
export type ProductInput = Omit<
  ProductAdmin,
  "_id" | "slug" | "codigoUrl" | "createdAt" | "updatedAt" | "ordenHome" | "ordenPorCategoria"
>;
