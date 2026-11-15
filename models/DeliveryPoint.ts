import { Schema, model, models } from "mongoose";

// Punto de entrega (fase 16b, D-72). Nunca se borra: se desactiva (N1-3).
const DeliveryPointSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    direccion: { type: String, required: true, trim: true, maxlength: 200 },
    referencia: { type: String, default: "", trim: true, maxlength: 200 },
    horario: { type: String, default: "", trim: true, maxlength: 200 },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export default models.DeliveryPoint || model("DeliveryPoint", DeliveryPointSchema);
