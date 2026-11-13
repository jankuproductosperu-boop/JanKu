import { Schema, model, models, type Model } from "mongoose";

export interface IRateLimit {
  key: string;
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  // Formato <politica>:<tipo>:<valor>, ej. login-admin:ip:190.1.2.3
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  windowStart: { type: Date, required: true },
  blockedUntil: { type: Date, default: null },
  // max(windowStart + ventana, blockedUntil). TTL real sobre un campo Date.
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (models.RateLimit as Model<IRateLimit>) || model<IRateLimit>("RateLimit", RateLimitSchema);
