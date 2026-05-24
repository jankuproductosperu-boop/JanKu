import mongoose, { Schema, model, models } from "mongoose";

// ── Rate limiting para login de usuarios ─────────────────────────────────────
const UserLoginBlockSchema = new Schema({
  ip: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  lastAttempt: { type: Number, default: 0 },
  blockedUntil: { type: Number, default: null },
}, { timestamps: true });

// TTL: MongoDB limpia automáticamente después de 1 hora
UserLoginBlockSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 3600 });

export default models.UserLoginBlock || model("UserLoginBlock", UserLoginBlockSchema);