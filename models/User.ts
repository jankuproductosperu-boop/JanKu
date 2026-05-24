import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  email: string;
  password: string;
  emailVerificado: boolean;
  tokenVerificacion?: string;
  tokenVerificacionExpira?: Date;
  tokenResetPassword?: string;
  tokenResetPasswordExpira?: Date;
  tokenResetPasswordUsado?: boolean;
  intentosFallidos: number;
  bloqueadoHasta?: Date;
  activo: boolean;
  ultimoAcceso?: Date;
  direccion?: {
    calle?: string;
    ciudad?: string;
    departamento?: string;
    codigoPostal?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    password: { type: String, required: true, minlength: 8 },
    emailVerificado: { type: Boolean, default: false },
    tokenVerificacion: { type: String, default: null },
    tokenVerificacionExpira: { type: Date, default: null },
    tokenResetPassword: { type: String, default: null },
    tokenResetPasswordExpira: { type: Date, default: null },
    tokenResetPasswordUsado: { type: Boolean, default: false },
    intentosFallidos: { type: Number, default: 0 },
    bloqueadoHasta: { type: Date, default: null },
    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date, default: null },
    direccion: {
      calle: { type: String, default: "" },
      ciudad: { type: String, default: "" },
      departamento: { type: String, default: "" },
      codigoPostal: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Índices
UserSchema.index({ tokenVerificacion: 1 });
UserSchema.index({ tokenResetPassword: 1 });
// TTL: eliminar tokens de verificación expirados automáticamente
UserSchema.index(
  { tokenVerificacionExpira: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { emailVerificado: false } }
);

export default models.User || model<IUser>("User", UserSchema);