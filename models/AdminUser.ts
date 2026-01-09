import mongoose, { Schema, model, models } from "mongoose";

const AdminUserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hash con bcrypt
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: true },
    ultimoAcceso: { type: Date }
  },
  { timestamps: true }
);

export default models.AdminUser || model("AdminUser", AdminUserSchema);