import mongoose, { Schema, model, models, Document } from "mongoose";

// ✅ Definir interfaz para el producto
interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  slug?: string;
  precio: number;
  descripcion?: string;
  descripcionCompleta?: string;
  categorias?: string[];
  categoriaSlugs?: string[];
  stock: "Disponible" | "Limitado" | "Agotado";
  imagenUrl?: string;
  imagenesAdicionales?: string[];
  videoUrl?: string;
  deliveryHuancayo: boolean;
  mostrarEnHome: boolean;
  whatsappLink?: string;
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
  caracteristicas?: string[];
  garantia?: string;
  envioGratis: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    nombre: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
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
    imagenUrl: { type: String, default: "" },
    imagenesAdicionales: [{ type: String }],
    videoUrl: { type: String, default: "" },
    deliveryHuancayo: { type: Boolean, default: true },
    mostrarEnHome: { type: Boolean, default: false },
    whatsappLink: { type: String, default: "" },
    metaTitulo: { type: String, default: "" },
    metaDescripcion: { type: String, default: "" },
    metaImagen: { type: String, default: "" },
    caracteristicas: [{ type: String }],
    garantia: { type: String, default: "" },
    envioGratis: { type: Boolean, default: true }
  },
  { 
    timestamps: true,
    strict: false,
    autoIndex: true // ✅ Agregar esto
  }
);

// Índices para búsquedas rápidas
ProductSchema.index({ categoriaSlugs: 1 });
ProductSchema.index({ mostrarEnHome: 1 });
ProductSchema.index({ nombre: 'text', descripcion: 'text' });
ProductSchema.index({ precio: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ categoriaSlug: 1, stock: 1, precio: 1 });

// Generar slug automáticamente
ProductSchema.pre('validate', async function() {
  if (this.nombre && !this.slug) {
    let baseSlug = this.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    const Product = models.Product || model<IProduct>("Product", ProductSchema);
    
    let exists = await Product.findOne({ slug, _id: { $ne: this._id } }).exec();
    while (exists) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      exists = await Product.findOne({ slug, _id: { $ne: this._id } }).exec();
    }
    
    this.slug = slug;
  }
});

// Eliminar el modelo en caché
delete mongoose.models.Product;

export default mongoose.model<IProduct>("Product", ProductSchema);