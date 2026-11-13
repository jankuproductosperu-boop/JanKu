export type StockEstado = "Disponible" | "Limitado" | "Agotado";

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
  stockCantidad?: number;
  stockMinimo?: number;
  activo?: boolean;
  ordenHome?: number;
  ordenPorCategoria?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductAdmin = Product & { precioCosto?: number; proveedor?: string };
export type ProductInput = Omit<
  ProductAdmin,
  "_id" | "slug" | "codigoUrl" | "createdAt" | "updatedAt" | "ordenHome" | "ordenPorCategoria"
>;
