import { Schema, model, models } from "mongoose";

// Cupón de descuento (fase 18, D-38 a D-44). Nunca se borra: se desactiva (N1-3).
// `usosActuales` solo lo cambia coupon.service con $inc condicional dentro de una transacción.
const CouponSchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z0-9-]{4,20}$/,
    },
    descripcion: { type: String, default: "", maxlength: 200 },
    tipo: { type: String, enum: ["porcentaje", "monto_fijo"], required: true },
    valor: { type: Number, required: true, min: 0 },
    topeDescuento: { type: Number, default: null },
    montoMinimo: { type: Number, required: true, default: 0, min: 0 },
    fechaInicio: { type: Date, default: null },
    fechaFin: { type: Date, default: null },
    usosMaximos: { type: Number, default: null },
    usosPorCliente: { type: Number, required: true, default: 1, min: 1 },
    usosActuales: { type: Number, required: true, default: 0, min: 0 },
    acumulable: { type: Boolean, required: true, default: false },
    activo: { type: Boolean, required: true, default: true },
    creadoPor: { type: Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true },
);

// `codigo` ya es único por la opción del campo.

export default models.Coupon || model("Coupon", CouponSchema);
