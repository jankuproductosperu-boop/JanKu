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
  /** Se incrementa para invalidar todas las sesiones abiertas (D-15). */
  tokenVersion: number;
  telefono: string;
  direccion?: {
    calle?: string;
    ciudad?: string;
    departamento?: string;
    codigoPostal?: string;
  };
  terminos?: { version?: string; aceptadoEn?: Date };
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
    tokenVersion: { type: Number, default: 0 },
    telefono: { type: String, default: "" },
    direccion: {
      calle: { type: String, default: "" },
      ciudad: { type: String, default: "" },
      departamento: { type: String, default: "" },
      codigoPostal: { type: String, default: "" },
    },
    // Aceptación de términos y privacidad (fase 22a, D-76): versión de los textos y fecha del servidor.
    terminos: {
      version: { type: String },
      aceptadoEn: { type: Date },
    },
  },
  { timestamps: true }
);

// Índices
UserSchema.index({ tokenVerificacion: 1 });
UserSchema.index({ tokenResetPassword: 1 });
// TTL: MongoDB borra el DOCUMENTO COMPLETO del usuario (no solo el token) cuando
// vence tokenVerificacionExpira y la cuenta sigue sin verificar (emailVerificado: false).
// Las cuentas verificadas quedan fuera del filtro parcial y nunca se borran por aquí.
UserSchema.index(
  { tokenVerificacionExpira: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { emailVerificado: false } }
);

export default models.User || model<IUser>("User", UserSchema);