import mongoose, { Schema, model, models, Document, type Model } from "mongoose";
import { estadoDeStock } from "@/lib/stock";

// ✅ Definir interfaz para el producto
export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  slug?: string;
  codigoUrl?: string;
  precio: number;
  descripcion?: string;
  descripcionCompleta?: string;
  categorias?: string[];
  categoriaSlugs?: string[];
  stock: "Disponible" | "Limitado" | "Agotado";
  imagenes?: string[];
  imagenPrincipal?: string;
  imagenUrl?: string;
  imagenesAdicionales?: string[];
  tags?: string[];
  videoUrl?: string;
  deliveryHuancayo: boolean;
  mostrarEnHome: boolean;
  nuevoHasta?: Date | null; // novedad de la semana: es novedad mientras la fecha sea futura
  whatsappLink?: string;
  whatsappNumero?: string;
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
  caracteristicas?: string[];
  garantia?: string;
  envioGratis: boolean;

  // ── Inventario ────────────────────────────────────────────────────────
  codigo?: string;
  precioCosto?: number;
  stockCantidad: number;
  stockMinimo: number;
  proveedor?: string;
  activo: boolean;

  // ── Orden manual (nuevo) ─────────────────────────────────────────────────
  // Número más bajo = aparece primero. Los productos sin valor asignado
  // quedan al final, ordenados por defecto.
  ordenHome: number;                       // orden dentro de la página de inicio
  ordenPorCategoria?: Map<string, number>; // orden independiente por cada categoría (clave = slug)

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    nombre: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    codigoUrl: { type: String, unique: true, sparse: true, index: true },
    precio: { type: Number, required: true },
    descripcion: { type: String, default: "" },
    descripcionCompleta: { type: String, default: "" },
    categorias: [{ type: String }],
    categoriaSlugs: [{ type: String }],
    stock: {
      type: String,
      enum: ["Disponible", "Limitado", "Agotado"],
      default: "Disponible"
    },
    imagenes: [{ type: String }],
    imagenPrincipal: { type: String, default: "" },
    imagenUrl: { type: String, default: "" },
    imagenesAdicionales: [{ type: String }],
    videoUrl: { type: String, default: "" },
    deliveryHuancayo: { type: Boolean, default: true },
    mostrarEnHome: { type: Boolean, default: false },
    nuevoHasta: { type: Date, default: null },
    whatsappLink: { type: String, default: "" },
    whatsappNumero: { type: String, default: "" },
    metaTitulo: { type: String, default: "" },
    metaDescripcion: { type: String, default: "" },
    metaImagen: { type: String, default: "" },
    caracteristicas: [{ type: String }],
    tags: [{ type: String }],
    garantia: { type: String, default: "" },
    envioGratis: { type: Boolean, default: true },

    // ── Inventario ────────────────────────────────────────────────────────
    codigo: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
    precioCosto: { type: Number, default: 0, min: 0 },
    stockCantidad: { type: Number, default: 0, min: 0 },
    stockMinimo: { type: Number, default: 5, min: 0 },
    proveedor: { type: String, default: "" },
    activo: { type: Boolean, default: true },

    // ── Orden manual (nuevo) ─────────────────────────────────────────────────
    ordenHome: { type: Number, default: 0 },
    ordenPorCategoria: { type: Map, of: Number, default: {} },
  },
  {
    timestamps: true,
    strict: false,
    autoIndex: true
  }
);

// Índices para búsquedas rápidas
ProductSchema.index({ categoriaSlugs: 1 });
ProductSchema.index({ mostrarEnHome: 1 });
ProductSchema.index({ nombre: 'text', descripcion: 'text' });
ProductSchema.index({ precio: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ categoriaSlugs: 1, stock: 1, precio: 1 });
ProductSchema.index({ activo: 1, mostrarEnHome: 1 });
ProductSchema.index({ stockCantidad: 1 });
ProductSchema.index({ ordenHome: 1 });

// Generar slug automáticamente + calcular estado de stock automáticamente
ProductSchema.pre('validate', async function () {
  if (this.nombre && !this.slug) {
    const baseSlug = this.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;
    const Product = this.constructor as Model<IProduct>;

    let exists = await Product.findOne({ slug, _id: { $ne: this._id } }).exec();
    while (exists) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      exists = await Product.findOne({ slug, _id: { $ne: this._id } }).exec();
    }

    this.slug = slug;
  }
  if (!this.codigoUrl && this._id) {
    this.codigoUrl = this._id.toString().slice(-8);
  }

  // ── Calcular automáticamente el estado de stock ──────────────────────────
  if (typeof this.stockCantidad === "number") {
    const minimo = typeof this.stockMinimo === "number" ? this.stockMinimo : 5;
    this.stock = estadoDeStock(this.stockCantidad, minimo);
  }

  // Normalizar código vacío a undefined para no romper el índice único+sparse
  if (this.codigo !== undefined && this.codigo.trim() === "") {
    this.codigo = undefined;
  }
});

const Product = (models.Product as Model<IProduct>) || model<IProduct>("Product", ProductSchema);
export default Product;
