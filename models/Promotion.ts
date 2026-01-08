import mongoose, { Schema, model, models } from "mongoose";

const PromotionSchema = new Schema(
  {
    titulo: { type: String, required: true },
    descripcion: { type: String, default: "" },
    descripcionCompleta: { type: String, default: "" },
    precio: { type: Number, required: true },
    precioAnterior: { type: Number }, // Precio antes del descuento (opcional)
    imagenUrl: { type: String, required: true },
    imagenesAdicionales: [{ type: String }],
    tipoEtiqueta: { 
      type: String, 
      enum: ["Combo", "2x1", "Descuento", "Oferta", "Nuevo"],
      default: "Oferta"
    },
    stock: { 
      type: String, 
      enum: ["Disponible", "Limitado", "Agotado"],
      default: "Disponible" 
    },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 }, // Para ordenar las promociones
    whatsappLink: { type: String, default: "" },
    caracteristicas: [{ type: String }],
    
    // SEO
    metaTitulo: { type: String },
    metaDescripcion: { type: String },
    metaImagen: { type: String }
  },
  { timestamps: true }
);

export default models.Promotion || model("Promotion", PromotionSchema);