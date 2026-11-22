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
  /**
   * Fase 26b. Ausente = 2FA desactivada (sin migración, como tokenVersion). Los secretos van cifrados
   * con AES-256-GCM (server/auth/totp.ts); ninguno de estos campos sale por la API.
   */
  totp?: {
    secretoCifrado?: string;
    activo?: boolean;
    activadoEn?: Date;
    /** Último paso de 30 s aceptado: el mismo código no vale dos veces. */
    ultimoPaso?: number;
    /** Secreto generado al empezar a activarla, hasta que se confirma con un código. */
    secretoPendienteCifrado?: string;
    pendienteEn?: Date;
  };
  /** HMAC-SHA256 de los códigos de rescate que quedan sin usar. */
  codigosRescate?: string[];
  /** HMAC-SHA256 de las últimas IP desde las que entró (nunca la IP en claro). */
  ipsConocidas?: string[];
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
    // Fase 26b. Sin valores por defecto: guardar un documento antiguo no escribe estos campos.
    totp: {
      type: new Schema(
        {
          secretoCifrado: { type: String },
          activo: { type: Boolean },
          activadoEn: { type: Date },
          ultimoPaso: { type: Number },
          secretoPendienteCifrado: { type: String },
          pendienteEn: { type: Date },
        },
        { _id: false },
      ),
      default: undefined,
    },
    codigosRescate: { type: [String], default: undefined },
    ipsConocidas: { type: [String], default: undefined },
  },
  { timestamps: true }
);

const AdminUser: Model<IAdminUser> =
  (models.AdminUser as Model<IAdminUser> | undefined) || model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
