export type AdminRol = "superadmin" | "gestor" | "ventas";

export type Permiso =
  | "catalogo.editar"
  | "inventario.ver"
  | "inventario.editar"
  | "costos.ver"
  | "pedidos.ver"
  | "pedidos.gestionar"
  | "descuentos.gestionar"
  | "cupones.gestionar"
  | "admins.gestionar"
  | "estadisticas.ver"; // fase 23b: solo superadmin

export type AdminSession = {
  id: string;
  username: string;
  nombre: string;
  rol: AdminRol;
  permisos: Permiso[];
  /** Fase 26b: la verificación en dos pasos está activa en esta cuenta. */
  totpActivo?: boolean;
};

/** Fase 26b: estado de la verificación en dos pasos de la cuenta propia (GET /api/admin/seguridad). */
export type SeguridadEstado = {
  activo: boolean;
  activadoEn?: string;
  codigosRestantes: number;
  /** Obligatoria para el superadmin; opcional para gestor y ventas. */
  obligatoria: boolean;
  /** false si falta TOTP_ENC_KEY en el servidor: no se puede activar. */
  disponible: boolean;
};

/** Respuesta de POST /api/admin/seguridad/iniciar: lo que se muestra para escanear o escribir. */
export type SeguridadInicio = { secreto: string; uri: string };

export type AdminUserPublic = {
  _id: string;
  username: string;
  nombre: string;
  email: string;
  rol: AdminRol;
  activo: boolean;
  ultimoAcceso?: string;
  createdAt?: string;
};
