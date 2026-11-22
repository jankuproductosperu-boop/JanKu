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
