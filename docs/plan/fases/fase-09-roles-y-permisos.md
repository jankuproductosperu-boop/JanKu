# Fase 09 · Roles de administrador y gestión de cuentas (backend)

> ⚠️ **ALTO RIESGO — autenticación y migración.** Incluye la primera migración de datos del plan. `--apply` lo ejecuta solo el dueño.

## 1. Objetivo y por qué va en este orden

Guardar el rol de cada administrador en la base, migrar a los existentes a `superadmin`, y dar a un superadmin la forma de crear, cambiar de rol y desactivar a otros administradores por API. También crea el ejecutor común de migraciones y reemplaza los scripts con contraseña fija.

Va después de la fase 08 (que ya aplica permisos leyendo `rol ?? "superadmin"`) y antes de la 10, que es la primera en distinguir qué ve cada rol.

## 2. Prerrequisitos

- Fase 08 fusionada **y desplegada**.
- **Respuesta a P1**: saber con certeza a qué base apunta `.env.local`.
- **Pasos manuales del dueño**, en este orden:
  1. Simular: `node scripts/migrations/001-admin-roles.mjs` → revisar que lista a los administradores esperados.
  2. Aplicar en la base de desarrollo, probar la fase en local.
  3. Aplicar en producción **antes** de desplegar el código de esta fase.
- Rama: `fase-09-roles-y-permisos`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Modificar | `models/AdminUser.ts` | Añadir `rol: { type: String, enum: ["superadmin","gestor","ventas"], default: "gestor" }` |
| Crear | `scripts/migrations/_runner.mjs` | Ejecutor común (contrato en `02-datos.md` §4.1) |
| Crear | `scripts/migrations/001-admin-roles.mjs` | Migración 001 |
| Crear | `scripts/admin/crear-admin.mjs` | Alta interactiva, sin contraseña fija |
| Crear | `scripts/admin/cambiar-password.mjs` | Cambio interactivo; incrementa `tokenVersion` |
| Crear | `server/validation/admin-user.schema.ts` | `adminCrearSchema`, `adminActualizarSchema` |
| Crear | `server/services/admin-user.service.ts` | Ver contrato |
| Crear | `app/api/admin/users/route.ts` | `GET` lista, `POST` crea |
| Crear | `app/api/admin/users/[id]/route.ts` | `PATCH` actualiza |
| Modificar | `scripts/legacy/create-admin.js` | Añadir al inicio `console.error("Obsoleto. Usa scripts/admin/crear-admin.mjs"); process.exit(1);` |

## 4. Pasos de implementación

1. `scripts/migrations/_runner.mjs` según `02-datos.md` §4.1. Para mostrar host y base sin credenciales: `new URL(uri)` → imprimir `url.hostname` y `url.pathname.slice(1)`; **nunca** imprimir la URI.
2. `001-admin-roles.mjs`: `coleccion: "adminusers"`, `filtro: { rol: { $exists: false } }`, `cambio: () => ({ rol: "superadmin", tokenVersion: 0 })`. En los ejemplos impresos mostrar solo `_id` y `username`.
3. Probar el ejecutor **solo en simulación**. El ejecutor de la fase (el modelo) **no** pasa `--apply`.
4. `models/AdminUser.ts`: añadir `rol`.
5. `server/validation/admin-user.schema.ts` y `server/services/admin-user.service.ts`.
6. Rutas `/api/admin/users`. Todas empiezan con `const actor = await requireAdmin("admins.gestionar")`.
7. `scripts/admin/crear-admin.mjs`: pregunta por `readline` usuario, nombre, email, rol y contraseña (dos veces; no se muestra en pantalla; mismas reglas que `adminCrearSchema`). Hash `bcrypt` con coste 12. Imprime "Admin creado: <username> (<rol>)". **Nunca imprime la contraseña.** Al arrancar muestra host y base como el ejecutor de migraciones y pide confirmar.
8. `scripts/admin/cambiar-password.mjs`: pide usuario y contraseña nueva (dos veces); actualiza `password` y hace `$inc: { tokenVersion: 1 }`.
9. Añadir al smoke: `GET /api/admin/users` sin cookie → 401.
10. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// server/validation/admin-user.schema.ts   (.strict(): endpoints nuevos)
const password = z.string().min(10, "Mínimo 10 caracteres").max(200)
  .regex(/[A-Z]/, "Debe tener una mayúscula").regex(/[a-z]/, "Debe tener una minúscula").regex(/[0-9]/, "Debe tener un número");
export const adminCrearSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion"),
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  rol: z.enum(["superadmin", "gestor", "ventas"]),
  password,
}).strict();
export const adminActualizarSchema = z.object({
  nombre: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  rol: z.enum(["superadmin", "gestor", "ventas"]).optional(),
  activo: z.boolean().optional(),
  password: password.optional(),
}).strict();
```

```ts
// server/services/admin-user.service.ts
export async function listarAdmins(): Promise<AdminUserPublic[]>;                       // nunca incluye password ni tokenVersion
export async function crearAdmin(datos: AdminCrear, actor: { adminId: string }): Promise<AdminUserPublic>;
export async function actualizarAdmin(id: string, datos: AdminActualizar, actor: { adminId: string }): Promise<AdminUserPublic>;
```
Reglas de `actualizarAdmin` (cada una lanza `conflicto(mensaje, code)`):

| Regla | `code` | Mensaje |
|---|---|---|
| El actor no puede cambiar su propio `rol` ni su propio `activo` | `NO_AUTOEDICION` | "No puedes cambiar tu propio rol ni desactivarte" |
| No puede quedar el sistema sin ningún `superadmin` activo (al degradar o desactivar al último) | `ULTIMO_SUPERADMIN` | "Debe quedar al menos un superadministrador activo" |
| `username` o `email` repetido al crear | `DUPLICADO` | "Ya existe un administrador con ese usuario o correo" |

Efectos: si cambia `password`, `rol` o `activo` → `$inc: { tokenVersion: 1 }` (cierra las sesiones de ese admin). Cada alta y cambio se registra con `log.info("admin.cambio", { actorId, objetivoId, campos: [...] })` (nombres de campo, nunca valores).

Para la regla "último superadmin", contar como superadmin activo a todo documento con `activo !== false` y (`rol === "superadmin"` **o** `rol` ausente).

| Endpoint | Permiso | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/admin/users` | `admins.gestionar` | — | `AdminUserPublic[]` |
| `POST /api/admin/users` | `admins.gestionar` | `adminCrearSchema` | 201 `AdminUserPublic` |
| `PATCH /api/admin/users/[id]` | `admins.gestionar` | `adminActualizarSchema` | `AdminUserPublic` |

No hay `DELETE`: los administradores se desactivan, no se borran.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-3 / N1-8**: el modelo ejecutor no usa `--apply` bajo ningún concepto. El script de migración es de solo-añadir y hace copia previa.
- **N1-2**: ni los scripts ni los logs imprimen contraseñas, hashes ni la URI de Mongo.
- **N1-4**: (a) un documento sin `rol` sigue siendo `superadmin`, de modo que si se despliega el código antes de migrar nadie pierde acceso; (b) las reglas "último superadmin" y "no autoedición" impiden quedarse sin administrador desde la interfaz.
- **N1-7**: no se crea la página `/admin/usuarios` (fase 21).

## 7. Criterios de aceptación verificables

- `node scripts/migrations/001-admin-roles.mjs` (simulación) imprime host, base, modo `SIMULACIÓN`, número de documentos y **no modifica nada** (comprobar con una segunda ejecución: mismos números).
- Tras aplicar (lo hace el dueño): una nueva simulación dice "0 documentos por cambiar" y existe `backups/<fecha>-001-admin-roles.json`.
- Con un admin `ventas` creado por API: `POST /api/products` → 403 `{ code: "PROHIBIDO" }`; `GET /api/admin/users` → 403.
- Con un `gestor`: `POST /api/products` → funciona; `GET /api/admin/users` → 403.
- Con el único `superadmin`: `PATCH` sobre sí mismo con `{ rol: "gestor" }` → 409 `NO_AUTOEDICION`. `PATCH` desactivando al único otro superadmin cuando él mismo está… (caso general) → al intentar dejar cero superadmins activos → 409 `ULTIMO_SUPERADMIN`.
- `POST /api/admin/users` con contraseña de 6 caracteres → 400 con `fields.password`.
- Ninguna respuesta de `/api/admin/users` contiene la clave `password`.
- Cambiar el rol de un admin con sesión abierta → su siguiente petición devuelve 401 (sesión cerrada por `tokenVersion`).
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Simulé la migración 001 y la lista de administradores es la que esperaba.
- [ ] Apliqué la 001 en desarrollo; segunda simulación = 0 cambios.
- [ ] Fase 00 completa.
- [ ] Entro a `/admin` como siempre y puedo hacer todo (soy `superadmin`).
- [ ] Creé un admin de prueba con `node scripts/admin/crear-admin.mjs` (rol `ventas`), entré con él y **no** pude guardar un producto.
- [ ] Desactivé ese admin de prueba (por API o en Atlas) y ya no puede entrar.
- [ ] Apliqué la 001 en producción **antes** de desplegar.

## 9. Plan de reversa

1. `git revert` del commit de fusión. El código de la fase 08 trata `rol` como dato desconocido y a todos como `superadmin`: se vuelve exactamente al comportamiento previo.
2. El campo `rol` puede quedarse en los documentos. Si hiciera falta restaurarlos, están en `backups/`.
3. Los admins creados durante la fase siguen existiendo: desactivarlos en Atlas (`activo: false`) si no deben conservarse, **porque tras revertir tendrían acceso total**.

## 10. Qué NO tocar en esta fase

- `server/auth/session.ts`, `guards.ts`, `proxy.ts` (cerrados en la fase 08).
- Páginas del panel.
- El modelo `User` y todo lo de clientes.
- Otros scripts de `scripts/legacy/`.

## 11. Modelo recomendado

**Sonnet** para el código, con dos condiciones: (1) el dueño revisa `_runner.mjs` y `001-admin-roles.mjs` antes de ejecutarlos, y (2) el dueño ejecuta personalmente cada `--apply`. Si se prefiere máxima seguridad en el ejecutor de migraciones (lo reutilizan las fases 13 y 15), usar un **modelo superior** para ese archivo.
