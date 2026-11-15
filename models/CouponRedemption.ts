import { Schema, model, models } from "mongoose";

// Canje de un cupón por un pedido (fase 18). Nunca se borra: al cancelar el pedido pasa a "liberado".
const CouponRedemptionSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true }, // un pedido, un canje
    clienteKey: { type: String, required: true }, // "user:<id>" o "tel:<51…>" (D-42)
    monto: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ["aplicado", "liberado"], required: true, default: "aplicado" },
  },
  { timestamps: true },
);

CouponRedemptionSchema.index({ couponId: 1, clienteKey: 1, estado: 1 });

export default models.CouponRedemption || model("CouponRedemption", CouponRedemptionSchema);
