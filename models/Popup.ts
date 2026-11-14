import { Schema, model, models } from "mongoose";

// Un único documento (clave "principal"): el popup de oferta de la tienda.
const PopupSchema = new Schema(
  {
    clave: { type: String, default: "principal", unique: true },
    imagenUrl: { type: String, default: "" },
    textoBoton: { type: String, default: "Ver oferta" },
    destinoTipo: { type: String, enum: ["producto", "categoria", "promocion", "enlace"], default: "enlace" },
    destinoRef: { type: String, default: "" },
    enlace: { type: String, default: "" },
    activo: { type: Boolean, default: false },
    desde: { type: Date, default: null },
    hasta: { type: Date, default: null },
  },
  { timestamps: true },
);

export default models.Popup || model("Popup", PopupSchema);
