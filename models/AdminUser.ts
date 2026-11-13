import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IAdminUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  password: string; // Hash con bcrypt
  nombre: string;
  email: string;
  activo: boolean;
  ultimoAcceso?: Date;
  /** Ausente en documentos anteriores a la migración 001: el guard lo trata como "superadmin". */
  rol?: "superadmin" | "gestor" | "ventas";
  /** Se incrementa para invalidar todas las sesiones abiertas (D-15). */
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hash con bcrypt
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date },
    rol: { type: String, enum: ["superadmin", "gestor", "ventas"], default: "gestor" },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AdminUser: Model<IAdminUser> =
  (models.AdminUser as Model<IAdminUser> | undefined) || model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
