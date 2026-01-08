import mongoose, { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
  {
    nombre: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    descripcion: { type: String, default: "" },
    imagenUrl: { type: String, default: "" },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Generar slug automáticamente antes de validar
CategorySchema.pre('validate', function() {
  if (this.nombre && !this.slug) {
    this.slug = this.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

export default models.Category || model("Category", CategorySchema);