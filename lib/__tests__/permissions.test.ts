import { describe, expect, it } from "vitest";
import { PERMISOS, ROLES, permisosDe, tienePermiso } from "@/lib/permissions";
import type { AdminRol, Permiso } from "@/types";

const TODOS: Permiso[] = [
  "catalogo.editar",
  "inventario.ver",
  "inventario.editar",
  "costos.ver",
  "pedidos.ver",
  "pedidos.gestionar",
  "descuentos.gestionar",
  "cupones.gestionar",
  "admins.gestionar",
];

describe("ROLES", () => {
  it("son exactamente los tres roles", () =>
    expect([...ROLES].sort()).toEqual(["gestor", "superadmin", "ventas"]));
  it("cada rol tiene entrada en la matriz", () =>
    ROLES.forEach((r) => expect(PERMISOS[r]).toBeDefined()));
});

describe("permisosDe", () => {
  it("superadmin tiene los 9 permisos", () =>
    expect([...permisosDe("superadmin")].sort()).toEqual([...TODOS].sort()));
  it("gestor tiene todos menos admins.gestionar", () =>
    expect([...permisosDe("gestor")].sort()).toEqual(TODOS.filter((p) => p !== "admins.gestionar").sort()));
  it("ventas tiene exactamente inventario.ver, pedidos.ver y pedidos.gestionar", () =>
    expect([...permisosDe("ventas")].sort()).toEqual(["inventario.ver", "pedidos.gestionar", "pedidos.ver"]));
  it("devuelve una copia que no altera la matriz", () => {
    const p = permisosDe("ventas");
    p.push("admins.gestionar");
    expect(tienePermiso("ventas", "admins.gestionar")).toBe(false);
  });
  it("un rol desconocido no tiene permisos", () =>
    expect(permisosDe("intruso" as unknown as AdminRol)).toEqual([]));
});

describe("tienePermiso", () => {
  it("superadmin puede gestionar admins", () => expect(tienePermiso("superadmin", "admins.gestionar")).toBe(true));
  it("gestor no puede gestionar admins", () => expect(tienePermiso("gestor", "admins.gestionar")).toBe(false));
  it("gestor puede editar catálogo", () => expect(tienePermiso("gestor", "catalogo.editar")).toBe(true));
  it("ventas no puede editar catálogo", () => expect(tienePermiso("ventas", "catalogo.editar")).toBe(false));
  it("ventas no ve costos", () => expect(tienePermiso("ventas", "costos.ver")).toBe(false));
  it("ventas gestiona pedidos", () => expect(tienePermiso("ventas", "pedidos.gestionar")).toBe(true));
  it("un rol desconocido no tiene ningún permiso", () =>
    TODOS.forEach((p) => expect(tienePermiso("intruso" as unknown as AdminRol, p)).toBe(false)));
  it("un rol con nombre de propiedad heredada no tiene permisos", () =>
    expect(tienePermiso("toString" as unknown as AdminRol, "catalogo.editar")).toBe(false));
});
