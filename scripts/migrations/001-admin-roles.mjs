// Migración 001 · fase 09. Da rol "superadmin" a los administradores que aún no tienen rol.
//   node scripts/migrations/001-admin-roles.mjs            → simula
//   node scripts/migrations/001-admin-roles.mjs --apply    → escribe (solo el dueño)

import { ejecutarMigracion } from "./_runner.mjs";

await ejecutarMigracion({
  nombre: "001-admin-roles",
  descripcion: "Administradores sin campo rol pasan a rol: \"superadmin\" (y tokenVersion: 0 si les falta).",
  coleccion: "adminusers",
  filtro: { rol: { $exists: false } },
  // tokenVersion solo se pone si falta: reiniciarlo a 0 podría reactivar sesiones ya revocadas.
  cambio: (doc) => ({
    rol: "superadmin",
    ...(doc.tokenVersion === undefined ? { tokenVersion: 0 } : {}),
  }),
  camposEjemplo: ["username"],
});
