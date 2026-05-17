import mongoose, { Schema, model, models } from "mongoose";

const LoginBlockSchema = new Schema({
  ip: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  lastAttempt: { type: Number, default: 0 },
  blockedUntil: { type: Number, default: null },
}, { timestamps: true });

// TTL: MongoDB borra automáticamente el documento 1 hora después de lastAttempt
LoginBlockSchema.index(
  { lastAttempt: 1 },
  { expireAfterSeconds: 3600 }
);

export default models.LoginBlock || model("LoginBlock", LoginBlockSchema);