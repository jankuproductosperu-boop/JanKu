# Fase 08 · Sesiones revocables y guards en cada handler

> ⚠️ **ALTO RIESGO — autenticación.** Un error puede dejar fuera al administrador o, peor, abrir rutas de escritura. Revisión del dueño obligatoria antes de fusionar y prueba completa en local antes de desplegar.

## 1. Objetivo y por qué va en este orden

1. Una sola librería JWT (`jose`) y un solo módulo que firma, verifica y maneja cookies.
2. Sesiones revocables: cada petición protegida comprueba en la base que la cuenta sigue activa y que el token no fue invalidado (`tokenVersion`).
3. **Cada handler protegido comprueba la sesión por sí mismo** (`requireAdmin` / `requireUser`), además del filtro por prefijo.
4. Matriz de permisos lista para usarse (los roles se guardan en la base en la fase 09; hasta entonces todo admin cuenta como `superadmin`, igual que hoy).
5. `middleware.ts` → `proxy.ts` (convención de Next.js 16).

Resuelve S4 y S5 y prepara S6. Va después del limitador (fase 07) y antes de crear cualquier endpoint `/api/admin/*`.

## 2. Prerrequisitos

- Fase 07 fusionada.
- **El dueño tiene a mano una forma de recuperar el acceso** si algo falla: acceso a Atlas y a `scripts/legacy/change-password.js`.
- Sin cambios en Render: `JWT_SECRET` y `USER_JWT_SECRET` no cambian.
- Rama: `fase-08-sesiones-y-guards`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `types/admin.ts` | `AdminRol`, `Permiso`, `AdminSession`, `AdminUserPublic`; exportar desde `types/index.ts` |
| Crear | `lib/permissions.ts` | `ROLES`, `PERMISOS`, `tienePermiso`, `permisosDe` |
| Crear | `lib/__tests__/permissions.test.ts` | Pruebas de la matriz |
| Crear | `server/auth/session.ts` | Firmar, verificar, cookies |
| Crear | `server/auth/guards.ts` | `requireAdmin`, `requireUser`, `getOptionalUser` |
| Modificar | `models/AdminUser.ts` | Añadir `tokenVersion: { type: Number, default: 0 }`; interfaz `IAdminUser`; modelo tipado |
| Modificar | `models/User.ts` | Añadir `tokenVersion` y `telefono: { type: String, default: "" }` (+ `IUser`); corregir el comentario del TTL |
| Modificar | `app/api/auth/login/route.ts` | Firma con `session.ts` |
| Modificar | `app/api/auth/check/route.ts` | Usa `requireAdmin()`; respuesta ampliada |
| Modificar | `app/api/auth/logout/route.ts` | Usa `borrarCookieAdmin()` |
| Modificar | `app/api/auth-user/login/route.ts` | Firma con `session.ts` |
| Modificar | `app/api/auth-user/check/route.ts` | Usa `getOptionalUser()` |
| Modificar | `app/api/auth-user/logout/route.ts` | Usa `borrarCookieUser()` |
| Modificar | `app/api/auth-user/profile/route.ts` | Usa `requireUser()`; se elimina `getUserIdFromToken` |
| Modificar | `app/api/auth-user/reset-password/route.ts` | Añade `$inc: { tokenVersion: 1 }` al actualizar la contraseña |
| Modificar | Los 11 `route.ts` de `products`, `categories`, `banners`, `promotions`, `discounts` | Primera línea de cada `POST`/`PUT`/`DELETE`: `await requireAdmin("<permiso>")` |
| Modificar | `app/api/upload/route.ts`, `app/api/upload/delete/route.ts` | Primera línea: `await requireAdmin("catalogo.editar")` (envolver el handler con `handle`) |
| Mover | `middleware.ts` → `proxy.ts` | Ver paso 8 |
| Modificar | `package.json` | `npm uninstall jsonwebtoken @types/jsonwebtoken` |
| Modificar | `scripts/smoke.mjs` | Comprobaciones nuevas (sección 7) |

Permiso por ruta de escritura: `products/**` (incluido `reorder`), `categories/**`, `banners/**`, `promotions/**`, `upload/**` → `"catalogo.editar"` · `discounts/**` → `"descuentos.gestionar"`.

## 4. Pasos de implementación

1. `types/admin.ts` y `lib/permissions.ts` con su prueba (contratos en sección 5).
2. Modelos: añadir los campos nuevos. **No** añadir todavía `rol` (fase 09).
3. `server/auth/session.ts`.
4. `server/auth/guards.ts`.
5. Rutas de autenticación de **admin**: sustituir `jwt.sign` y `jwt.verify`. El resto de cada ruta (limitador, validaciones, mensajes) no se toca.
6. Rutas de autenticación de **cliente**: ídem. En `profile`, `requireUser()` reemplaza a `getUserIdFromToken`; el `DELETE` sigue pidiendo contraseña.
7. Añadir el guard a las rutas de escritura de catálogo y de subida. En cada archivo, comprobar que **todos** los métodos de escritura lo tienen; los `GET` no.
8. **`proxy.ts`**:
   a. Leer la documentación local: buscar con `node_modules/next/dist/docs/**/proxy*` y leer el archivo de la convención. Confirmar nombre de archivo, nombre de la función exportada y que `config.matcher` sigue igual.
   b. Si la documentación lo confirma: `git mv middleware.ts proxy.ts`, renombrar la función exportada `middleware` → `proxy`.
   c. Si la documentación **no** coincide con esto, **no renombrar**: dejar `middleware.ts` y anotarlo en el reporte.
   d. En cualquier caso, dentro del archivo: añadir `"/api/admin"` a una lista nueva `ADMIN_ONLY_API_ROUTES` que exige `admin-token` válido para **todos** los métodos (también `GET`). El archivo sigue verificando solo la firma con `jose` (sin base de datos) y **no importa nada de `server/`**.
9. `npm uninstall jsonwebtoken @types/jsonwebtoken`. `grep -rn "jsonwebtoken" app server` → vacío.
10. Ampliar el smoke y ejecutar todo: typecheck, lint, test, build, smoke.
11. Ejecutar la fase 00.

## 5. Contratos

```ts
// types/admin.ts
export type AdminRol = "superadmin" | "gestor" | "ventas";
export type Permiso =
  | "catalogo.editar" | "inventario.ver" | "inventario.editar" | "costos.ver"
  | "pedidos.ver" | "pedidos.gestionar" | "descuentos.gestionar" | "cupones.gestionar" | "admins.gestionar";
export type AdminSession = { id: string; username: string; nombre: string; rol: AdminRol; permisos: Permiso[] };
export type AdminUserPublic = { _id: string; username: string; nombre: string; email: string; rol: AdminRol; activo: boolean; ultimoAcceso?: string; createdAt?: string };

// lib/permissions.ts
export const ROLES: readonly AdminRol[];
export const PERMISOS: Record<AdminRol, readonly Permiso[]>;   // exactamente la tabla de D-17
export function permisosDe(rol: AdminRol): Permiso[];
export function tienePermiso(rol: AdminRol, permiso: Permiso): boolean;
```

```ts
// server/auth/session.ts
export const COOKIE_ADMIN = "admin-token";
export const COOKIE_USER = "user-token";

export async function firmarAdmin(a: { id: string; username: string; email: string; tokenVersion: number }): Promise<string>;
//  claims: { sub: id, userId: id, username, email, tv, typ: "admin", v: 1 }   · exp 8h · HS256 · secreto JWT_SECRET
export async function firmarUser(u: { id: string; nombre: string; email: string; tokenVersion: number }): Promise<string>;
//  claims: { sub: id, userId: id, nombre, email, tv, typ: "user" }            · exp 7d · HS256 · secreto USER_JWT_SECRET

export type ClaimsAdmin = { id: string; tv: number };
export type ClaimsUser = { id: string; tv: number; nombre?: string; email?: string };
export async function verificarAdmin(token: string): Promise<ClaimsAdmin | null>;   // null si firma inválida o expirado
export async function verificarUser(token: string): Promise<ClaimsUser | null>;
//  Compatibilidad: id = payload.sub ?? payload.userId ;  tv = payload.tv ?? 0

export async function ponerCookieAdmin(token: string): Promise<void>;  // httpOnly, secure en producción, sameSite "strict", path "/", maxAge 8h
export async function ponerCookieUser(token: string): Promise<void>;   // ídem, maxAge 7d
export async function borrarCookieAdmin(): Promise<void>;
export async function borrarCookieUser(): Promise<void>;
```
Se siguen escribiendo `userId` y `v: 1` además de `sub`/`tv` para que, si hay que revertir esta fase, el código anterior entienda los tokens nuevos.

```ts
// server/auth/guards.ts
/** Lanza noAutorizado() si no hay sesión válida; prohibido() si falta el permiso. */
export async function requireAdmin(permiso?: Permiso): Promise<AdminSession>;
/** Lanza noAutorizado(). */
export async function requireUser(): Promise<SessionUser>;
/** Nunca lanza. */
export async function getOptionalUser(): Promise<SessionUser | null>;
```
Algoritmo de `requireAdmin`:
1. Leer cookie `admin-token` → `verificarAdmin` → si `null`, `noAutorizado()`.
2. `AdminUser.findById(id).select("username nombre rol activo tokenVersion").lean()`.
3. Si no existe, `activo === false`, o `(doc.tokenVersion ?? 0) !== tv` → `noAutorizado()`.
4. `rol = doc.rol ?? "superadmin"` (si faltaba: `log.warn("admin.sin_rol", { id })`).
5. Si `permiso` y `!tienePermiso(rol, permiso)` → `prohibido()`.
6. Devolver `{ id, username, nombre, rol, permisos: permisosDe(rol) }`.

`requireUser` es análogo con `User` (`select("nombre email emailVerificado activo tokenVersion")`), devuelve `{ id, nombre, email, emailVerificado }`.

Respuestas:

| Endpoint | Antes | Después |
|---|---|---|
| `GET /api/auth/check` | `{ authenticated: true }` | `{ authenticated: true, admin: { username, nombre, rol, permisos } }` (aditivo) |
| `GET /api/auth-user/check` | `{ authenticated: true, user: { id, nombre, email } }` | igual + `user.emailVerificado` (aditivo). Sin sesión: 401 `{ authenticated: false }`, como hoy |
| `POST /api/auth/login`, `/api/auth-user/login` | — | sin cambios de cuerpo |
| Escrituras de catálogo sin sesión | 401 `{ error: "No autorizado — se requiere autenticación" }` (lo emite el proxy) | igual (el proxy responde primero) |

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-4**: (a) opciones de cookie idénticas a las actuales; (b) el proxy **no pierde** ninguna ruta protegida, solo gana `/api/admin`; (c) los guards se añaden, no sustituyen al proxy; (d) duraciones de token sin cambios.
- **N1-6**: los tokens emitidos antes de la fase siguen siendo válidos (mismo algoritmo y secreto; `tv` ausente = 0, que coincide con `tokenVersion` ausente = 0). **Nadie debe ser desconectado por desplegar esta fase.**
- **N1-2**: no registrar tokens ni secretos. `log` solo recibe ids.
- **N1-3**: campos nuevos con valor por defecto; sin migración.

## 7. Criterios de aceptación verificables

- `npm test` incluye `permissions.test.ts`: `superadmin` tiene los 9 permisos; `gestor` todos menos `admins.gestionar`; `ventas` exactamente `inventario.ver`, `pedidos.ver`, `pedidos.gestionar`.
- **Sesión previa sigue viva**: iniciar sesión de admin en `main`, cambiar a la rama, reiniciar el servidor → `/admin` carga sin pedir login.
- **Revocación**: con sesión de admin abierta, poner `activo: false` a ese admin en la base → `GET /api/auth/check` devuelve 401 y cualquier `POST /api/products` devuelve 401. Volver a `true` → funciona de nuevo.
- **`tokenVersion`**: con sesión abierta, poner `tokenVersion: 1` en la base → 401. Volver a iniciar sesión → funciona.
- **Guard independiente del proxy**: llamar a `POST /api/products` con una cookie `admin-token` firmada correctamente pero de un admin inexistente → 401 (lo emite el guard).
- Smoke ampliado: `GET /api/admin/cualquier-cosa` sin cookie → 401; `PUT /api/discounts/000000000000000000000000` sin cookie → 401; `POST /api/products/reorder` sin cookie → 401.
- `grep -rn "jwt\.\(sign\|verify\)\|jsonwebtoken" app server` → vacío.
- Cada archivo de ruta de escritura contiene `requireAdmin(`: `grep -L "requireAdmin(" app/api/{products,categories,banners,promotions,discounts,upload}/**/route.ts` → vacío.
- typecheck, lint, build en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Sin cerrar sesión antes de actualizar: tras el cambio sigo dentro de `/admin`.
- [ ] Cerrar sesión de admin y volver a entrar.
- [ ] Crear, editar y borrar un producto de prueba; subir una imagen; guardar un descuento; reordenar productos.
- [ ] En una ventana privada (sin sesión): abrir `/admin` → redirige a `/login-admin`.
- [ ] Cliente: iniciar sesión, ver y editar el perfil, cerrar sesión.
- [ ] Cliente: "olvidé mi contraseña" con una sesión abierta en otro navegador → tras cambiar la contraseña, el otro navegador pierde la sesión al recargar `/auth/perfil`.
- [ ] Tras desplegar en Render: repetir los tres primeros puntos en producción.

## 9. Plan de reversa

`git revert` del commit de fusión y `npm install` (restaura `jsonwebtoken`). Los tokens emitidos por el código nuevo incluyen `userId` y `v`, así que el código anterior los acepta: nadie pierde la sesión. Los campos `tokenVersion` y `telefono` quedan en la base sin efecto.

Si el administrador queda fuera y no se puede revertir de inmediato: en Atlas, comprobar que su documento tiene `activo: true` y `tokenVersion` igual al `tv` esperado (poner `tokenVersion: 0` y volver a iniciar sesión).

## 10. Qué NO tocar en esta fase

- El limitador (`server/auth/rateLimit.ts`) y su uso.
- `register`, `verify-email`, `forgot-password` (salvo nada).
- Páginas y componentes de cliente. `hooks/useAuth.ts` sigue igual (solo mira si `check` responde 200).
- No añadir el campo `rol` al modelo ni crear `/api/admin/users` (fase 09).
- `next.config.ts`.

## 11. Modelo recomendado

**Modelo superior (Opus)**, y revisión del dueño del diff de `server/auth/session.ts`, `server/auth/guards.ts` y `proxy.ts`. Motivo: compatibilidad con tokens existentes, dos sistemas de sesión en paralelo y una convención de Next.js recién renombrada que hay que verificar contra la documentación instalada.
