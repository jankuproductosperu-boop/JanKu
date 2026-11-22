# Fase 26b · Verificación en dos pasos del panel y aviso de acceso nuevo

> **Aprobada por el dueño (2026-11-21).** **Modelo: Fable 5.2** (cambiar con `/model` al iniciar la sesión). Toca el inicio de sesión del panel: un error puede dejar al dueño fuera o abrir un hueco.

> ⚠️ **Riesgo alto.** Antes de empezar: copia de seguridad con la fase 26a y comprobar que `scripts/admin/cambiar-password.mjs` funciona, porque es la salida de emergencia.

## 1. Objetivo

- **2FA con app (TOTP, RFC 6238):** tras la contraseña, el panel pide un código de 6 dígitos de Google Authenticator, Microsoft Authenticator o similar.
- **Códigos de rescate:** 8 códigos de un solo uso, mostrados una vez al activar, guardados con hash.
- **Aviso de acceso nuevo:** correo al administrador cuando entra desde una IP que no había usado.

## 2. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| Q1 | ¿Obligatoria para quién? | Obligatoria para **superadmin**; opcional para gestor y ventas |
| Q2 | ¿Recordar el dispositivo? | No: se pide en cada inicio de sesión (la sesión dura 8 h) |
| Q3 | ¿Aviso de IP nueva a quién? | Al correo del propio administrador; si es gestor o ventas, también al superadmin |
| Q4 | ¿Salida de emergencia si se pierden celular y códigos? | Script `scripts/admin/desactivar-2fa.mjs` que corre solo el dueño, con su confirmación |

## 3. Enfoque

- **Datos (migración 005, aditiva):** en `AdminUser`, `totp: { secretoCifrado, activo, activadoEn, ultimoPaso }`, `codigosRescate: [hash]` e `ipsConocidas: [hmac]`.
  - El secreto se cifra con AES-256-GCM y una clave nueva `TOTP_ENC_KEY`.
  - Las IP se guardan como HMAC, nunca en claro.
- **TOTP con `node:crypto`**, sin dependencias nuevas: HMAC-SHA1, 30 s, ventana de ±1 paso, comparación en tiempo constante, y un mismo paso no se acepta dos veces (`ultimoPaso`).
- **Flujo de login:**
  1. La contraseña correcta, si hay 2FA, no da `admin-token`: da una cookie `admin-2fa` de 5 minutos, firmada, `httpOnly`, `strict`, que solo sirve para el segundo paso.
  2. `POST /api/auth/login/2fa` valida el código y entrega la sesión normal.
  3. Mismo mensaje genérico si falla. Límite de intentos propio (`login-2fa:user`, 5 por 15 min) y bloqueo.
- **Pantalla `/admin/seguridad`:** activar (QR generado en el navegador, sin servicios externos), desactivar con contraseña y código, y regenerar códigos de rescate.
- **Al activar o desactivar** sube `tokenVersion`: se cierran las demás sesiones.
- `login-admin` conserva su forma de respuesta (N1-6): se añade un campo opcional `requiere2fa`.

## 4. Archivos (se detallan al empezar)

`models/AdminUser.ts`, `types/admin.ts`, `server/auth/totp.ts` (nuevo), `server/auth/session.ts`, `server/services/admin-user.service.ts`, `app/api/auth/login/route.ts`, `app/api/auth/login/2fa/route.ts` (nuevo), `app/api/admin/seguridad/**` (nuevo), `app/(admin)/login-admin/page.tsx`, `app/(admin)/admin/seguridad/page.tsx` (nuevo), `server/email/auth-emails.ts`, `scripts/migrations/005-admin-2fa.mjs`, `scripts/admin/desactivar-2fa.mjs`, `lib/totp.ts` con pruebas contra los vectores del RFC 6238, smoke y documentos.

Dependencia posible: una librería pequeña para dibujar el QR en el navegador (se pregunta antes de instalarla).

## 5. Verificación

Pruebas de TOTP con los vectores oficiales; prueba manual completa en janku-dev: activar, entrar, código equivocado, código repetido, código de rescate, desactivar y script de emergencia. Fase 00.

## 6. Ejecución (2026-11-21, rama `fase-26b-2fa-panel`)

Respuestas del dueño: Q1–Q4 por defecto; obligatoria para superadmin **bloqueando** el panel (solo Seguridad) hasta activarla; **sin migración 005** (campo ausente = desactivada); QR con `uqr@0.1.3`; lista de archivos ampliada. Decisión D-90.

**Archivos.** Nuevos: `lib/totp.ts` + `lib/__tests__/totp.test.ts` (vectores RFC 4226/6238), `server/auth/totp.ts`, `server/validation/seguridad.schema.ts`, `app/api/auth/login/2fa/route.ts`, `app/api/admin/seguridad/{route,iniciar,confirmar,desactivar,codigos-rescate}`, `app/(admin)/admin/seguridad/page.tsx`, `scripts/admin/desactivar-2fa.mjs`. Cambiados: `models/AdminUser.ts`, `types/admin.ts`, `server/auth/{session,guards,rateLimit}.ts`, `server/services/admin-user.service.ts`, `server/email/auth-emails.ts`, `app/api/auth/{login,check}/route.ts`, `app/(admin)/login-admin/page.tsx`, `app/(admin)/admin/_components/{AdminShell,AdminSidebar,useAdminSession}`, `scripts/smoke.mjs`, `.env.example`, `package.json` (uqr), documentos.

**Rutas nuevas.** `POST /api/auth/login/2fa` `{ codigo }` · `GET /api/admin/seguridad` · `POST /api/admin/seguridad/iniciar` `{ password }` → `{ secreto, uri }` · `POST …/confirmar` `{ codigo }` → `{ codigosRescate }` · `POST …/desactivar` `{ password, codigo }` → estado · `POST …/codigos-rescate` `{ password, codigo }` → `{ codigosRescate }`. Campos opcionales añadidos: `requiere2fa` en el login; `admin.totpActivo` y `activar2fa` en `/api/auth/check`.

**Orden para producción (lo hace el dueño).**
1. Copia de `jankuDB` con `node scripts/backup/respaldar.mjs`.
2. Generar una clave nueva para producción (distinta de la de desarrollo) y ponerla como `TOTP_ENC_KEY` en Render **antes** del push. Sin ella el superadmin queda limitado a la pantalla Seguridad, que avisa de que falta.
3. Push y despliegue. Al entrar, el superadmin activa la 2FA en Seguridad y guarda los 8 códigos de rescate.
4. Si se pierde la clave o el celular y los códigos: `node scripts/admin/desactivar-2fa.mjs` contra esa base.
