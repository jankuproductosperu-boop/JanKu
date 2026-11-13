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
  | "admins.gestionar";

export type AdminSession = {
  id: string;
  username: string;
  nombre: string;
  rol: AdminRol;
  permisos: Permiso[];
};

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
