import mongoose, { Schema, model, models } from "mongoose";

const DiscountTierSchema = new Schema(
  {
    nombre: { type: String, required: true }, // etiqueta interna, ej: "Descuento de temporada"
    montoMinimo: { type: Number, required: true, min: 0 }, // ej: 100
    tipoDescuento: {
      type: String,
      enum: ["porcentaje", "monto_fijo"],
      default: "porcentaje",
    },
    valorDescuento: { type: Number, required: true, min: 0 }, // 10 (%) o 15 (soles), según el tipo
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.DiscountTier || model("DiscountTier", DiscountTierSchema);