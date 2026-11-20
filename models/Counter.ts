import { Schema, model, models } from "mongoose";

// Correlativos atómicos (fase 22b). `_id` es el nombre del contador, p. ej. "reclamos-2026".
// Solo se incrementa con $inc; nunca se reinicia ni se borra (N1-3).
const CounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { versionKey: false },
);

export default models.Counter || model("Counter", CounterSchema);
