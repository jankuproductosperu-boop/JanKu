import mongoose, { Schema, model, models } from "mongoose";

const BannerSchema = new Schema(
  {
    titulo: { type: String, required: true },
    imagenUrl: { type: String, required: true },
    enlace: { type: String, default: "" },
    posicion: { 
      type: String, 
      enum: ["top-left", "top-right", "middle-full", "bottom-left", "bottom-right"],
      required: true 
    },
    ubicaciones: [{ type: String }], // ✅ Array de slugs: ["", "hogar", "tecnologia"]
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default models.Banner || model("Banner", BannerSchema);