import type { AdminRol, Permiso } from "@/types";

export const ROLES: readonly AdminRol[] = ["superadmin", "gestor", "ventas"];

/** Matriz fija de la decisión D-17. */
export const PERMISOS: Record<AdminRol, readonly Permiso[]> = {
  superadmin: [
    "catalogo.editar",
    "inventario.ver",
    "inventario.editar",
    "costos.ver",
    "pedidos.ver",
    "pedidos.gestionar",
    "descuentos.gestionar",
    "cupones.gestionar",
    "admins.gestionar",
  ],
  gestor: [
    "catalogo.editar",
    "inventario.ver",
    "inventario.editar",
    "costos.ver",
    "pedidos.ver",
    "pedidos.gestionar",
    "descuentos.gestionar",
    "cupones.gestionar",
  ],
  ventas: ["inventario.ver", "pedidos.ver", "pedidos.gestionar"],
};

function deRol(rol: AdminRol): readonly Permiso[] {
  return Object.prototype.hasOwnProperty.call(PERMISOS, rol) ? PERMISOS[rol] : [];
}

export function permisosDe(rol: AdminRol): Permiso[] {
  return [...deRol(rol)];
}

export function tienePermiso(rol: AdminRol, permiso: Permiso): boolean {
  return deRol(rol).includes(permiso);
}
