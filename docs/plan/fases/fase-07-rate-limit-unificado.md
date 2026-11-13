# Fase 07 · Límite de intentos unificado en MongoDB

> ⚠️ **ALTO RIESGO — autenticación.** Un error puede dejar a todos bloqueados fuera del login, o dejar el login sin protección contra fuerza bruta. Revisión del dueño obligatoria antes de fusionar.

## 1. Objetivo y por qué va en este orden

Sustituir los cuatro limitadores en memoria y las dos colecciones con TTL roto por **un solo mecanismo persistente** (`RateLimit`), añadir el límite que falta en "olvidé mi contraseña" y leer la IP correcta detrás de Cloudflare. Resuelve S7, S8 y S9.

Va antes de tocar sesiones (fase 08) para cambiar una sola cosa de autenticación cada vez, y antes de pedidos y cupones, que reutilizan este limitador.

## 2. Prerrequisitos

- Fase 06 fusionada.
- **Respuesta del dueño a P3** (¿todo el tráfico de `jan-ku.com` pasa por el proxy de Cloudflare?). Si no hay respuesta, se implementa el orden de D-19.
- **Confirmación del dueño de a qué base apunta `.env.local`** (P1): las pruebas de esta fase crean documentos en la colección `ratelimits`.
- Rama: `fase-07-rate-limit`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `models/RateLimit.ts` | Modelo (ver `02-datos.md` §3.1) |
| Crear | `server/auth/rateLimit.ts` | Políticas y funciones |
| Modificar | `server/auth/ip.ts` | Orden de cabeceras de D-19 |
| Modificar | `app/api/auth/login/route.ts` | Usa `rateLimit`; sin `loginTracker` ni `LoginBlock` |
| Modificar | `app/api/auth-user/login/route.ts` | Usa `rateLimit`; sin `userRateLimiter` ni `UserLoginBlock`. **Conserva** el bloqueo por cuenta (`intentosFallidos`, `bloqueadoHasta`) |
| Modificar | `app/api/auth-user/register/route.ts` | Usa `rateLimit` para registro y reenvío |
| Modificar | `app/api/auth-user/forgot-password/route.ts` | Añade límite por email y por IP |
| Eliminar | `server/auth/legacyLimiters.ts` | Ya sin uso |
| Sin tocar | `models/LoginBlock.ts`, `models/UserLoginBlock.ts` | Se conservan (N1-3); nadie los importa |

## 4. Pasos de implementación

1. Crear `models/RateLimit.ts`.
2. Crear `server/auth/rateLimit.ts` con el contrato de la sección 5. `registrarIntento` debe ser **atómico**: una sola operación `findOneAndUpdate` con *pipeline de agregación* y `upsert: true`, que:
   - si no existe o `windowStart + ventanaMs < ahora` → reinicia `count = 1`, `windowStart = ahora`, `blockedUntil = null`;
   - si no → `count = count + 1`;
   - si la política tiene `bloqueoMs` y el nuevo `count >= max` → `blockedUntil = ahora + bloqueoMs`;
   - recalcula `expiresAt = max(windowStart + ventanaMs, blockedUntil)`.
   Ante un error de clave duplicada (dos `upsert` simultáneos), reintentar **una** vez.
3. `server/auth/ip.ts`: `cf-connecting-ip` → `x-real-ip` → primer valor de `x-forwarded-for` → `"unknown"`. Mantener el saneado actual (`replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45)`).
4. **Login admin** — conservar el orden y los mensajes actuales:
   1. `estado = await consultar("login-admin", "ip", ip)` → si `bloqueado`, 429 con el mismo cuerpo de hoy (`error`, `blocked: true`, `remainingTime`).
   2. En cada fallo (entrada demasiado larga, usuario inexistente, contraseña incorrecta): `r = await registrarIntento("login-admin", "ip", ip)` y responder 401 con `remainingAttempts: r.restantes`.
   3. En éxito: `await reiniciar("login-admin", "ip", ip)`.
5. **Login cliente** — mismo esquema con la política `login-user`; cuerpo de respuesta igual que hoy (`bloqueado: true`, `intentosRestantes`). El bloque de bloqueo por cuenta no se modifica.
6. **Registro**: `r = await registrarIntento("register", "ip", ip)`; si `!r.permitido` → 429 con el mensaje actual. Reenvío de verificación: `registrarIntento("resend-verif", "email", emailNormalizado)`; si no permitido, **responder el mismo 200 genérico de hoy** sin enviar correo.
7. **Olvidé mi contraseña** (nuevo): tras validar el formato del email, `registrarIntento("forgot", "ip", ip)` y `registrarIntento("forgot", "email", emailNormalizado)`. Si cualquiera no está permitido → **mismo 200 genérico** ("Si ese email existe…") sin enviar correo ni tocar la base de usuarios. Registrar `log.warn("forgot.limite", { ip })` (sin el email completo).
8. Borrar `server/auth/legacyLimiters.ts`. `grep -rn "legacyLimiters\|LoginBlock" app server` → vacío.
9. Añadir a `scripts/smoke.mjs`: `POST /api/auth/login` con `{}` → 400 (no debe consumir intentos: la validación de campos vacíos va antes de `registrarIntento`, como hoy).
10. `npm run typecheck && npm run lint && npm test && npm run build && npm run smoke`.
11. Ejecutar la fase 00.

## 5. Contratos

```ts
// server/auth/rateLimit.ts
export type Politica = "login-admin" | "login-user" | "register" | "resend-verif" | "forgot" | "order" | "coupon";
export type TipoClave = "ip" | "email";

const POLITICAS: Record<string, { max: number; ventanaMs: number; bloqueoMs?: number }> = {
  "login-admin:ip":     { max: 3,  ventanaMs: 3_600_000, bloqueoMs: 900_000 },
  "login-user:ip":      { max: 5,  ventanaMs: 3_600_000, bloqueoMs: 900_000 },
  "register:ip":        { max: 3,  ventanaMs: 3_600_000 },
  "resend-verif:email": { max: 3,  ventanaMs: 3_600_000 },
  "forgot:email":       { max: 3,  ventanaMs: 3_600_000 },
  "forgot:ip":          { max: 10, ventanaMs: 3_600_000 },
  "order:ip":           { max: 5,  ventanaMs: 3_600_000 },
  "coupon:ip":          { max: 10, ventanaMs: 600_000 },
};

export type EstadoLimite = {
  permitido: boolean;      // false si este intento supera el máximo o hay bloqueo vigente
  bloqueado: boolean;      // hay blockedUntil en el futuro
  restantes: number;       // max - count, mínimo 0
  minutosRestantes?: number; // hasta fin de bloqueo o de ventana
};

/** Lee sin modificar. Para comprobar un bloqueo antes de validar credenciales. */
export async function consultar(politica: Politica, tipo: TipoClave, valor: string): Promise<EstadoLimite>;
/** Cuenta un intento (atómico) y devuelve el estado resultante. */
export async function registrarIntento(politica: Politica, tipo: TipoClave, valor: string): Promise<EstadoLimite>;
/** Borra el contador. Tras un login correcto. */
export async function reiniciar(politica: Politica, tipo: TipoClave, valor: string): Promise<void>;
```

Semántica de `permitido` en políticas **sin** bloqueo (`register`, `forgot`, `order`…): el intento número `max` está permitido; el `max + 1` no.
En políticas **con** bloqueo (`login-*`): se registran solo los **fallos**; al llegar a `max` fallos se activa el bloqueo.
Si `valor === "unknown"` (no se pudo obtener IP), se usa igualmente como clave: todos los "desconocidos" comparten contador. Es intencional.
Si la base falla dentro de `consultar`/`registrarIntento`: **propagar el error** (el handler responde 500). No se "deja pasar" el login cuando el limitador no funciona.

Formas de respuesta que deben mantenerse idénticas:

| Endpoint | Caso | Estado | Cuerpo |
|---|---|---|---|
| `POST /api/auth/login` | bloqueado | 429 | `{ error: "Demasiados intentos fallidos. Bloqueado por N minutos.", blocked: true, remainingTime: N }` |
| | fallo | 401 | `{ error: "Usuario o contraseña incorrectos", remainingAttempts: N }` |
| `POST /api/auth-user/login` | bloqueado | 429 | `{ error: "Demasiados intentos. Bloqueado por N minutos.", bloqueado: true }` |
| | fallo | 401 | `{ error: "Credenciales incorrectas", intentosRestantes: N }` |
| `POST /api/auth-user/register` | límite | 429 | `{ error: "Demasiados registros desde esta IP. Intenta en 1 hora." }` |

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-4**: (a) los umbrales no se suavizan: son los de D-18, iguales o más estrictos que hoy; (b) los mensajes genéricos anti-enumeración se conservan letra por letra; (c) el limitador falla cerrado.
- **N1-3**: no se borran `loginblocks` ni `userloginblocks`, ni sus modelos.
- **N1-6**: tabla de respuestas de la sección 5.
- **N1-8**: las pruebas se hacen en local. No ejecutar ráfagas de login contra producción.

## 7. Criterios de aceptación verificables

En local, con la base de desarrollo:
- 3 logins de admin fallidos seguidos → el 3.º devuelve `remainingAttempts: 0`; el 4.º devuelve 429 con `blocked: true`.
- **Reiniciar el servidor** (`Ctrl+C`, `npm run dev`) y reintentar → sigue 429 (antes de esta fase, el bloqueo en memoria se perdía).
- Un login correcto tras 2 fallos → entra, y el documento `login-admin:ip:…` desaparece de `ratelimits`.
- 4 llamadas a `POST /api/auth-user/forgot-password` con el mismo email → las 4 responden 200 con el mismo texto; solo las 3 primeras generan envío (comprobar en el log del servidor).
- En `ratelimits`, cada documento tiene `expiresAt` de tipo `Date`. El índice `expiresAt_1` existe con `expireAfterSeconds: 0`.
- Petición con cabecera `cf-connecting-ip: 1.1.1.1` y `x-forwarded-for: 9.9.9.9` → la clave creada usa `1.1.1.1`.
- `grep -rn "new Map" server/auth` → vacío.
- Todo en verde: typecheck, lint, test, build, smoke.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Login admin correcto → entra.
- [ ] Login admin con contraseña mala 3 veces → mensaje de bloqueo con minutos. **Para desbloquearme durante la prueba:** borrar en Atlas el documento de `ratelimits` cuya `key` empieza por `login-admin:ip:`.
- [ ] Login de cliente: contraseña mala muestra intentos restantes; correcto entra.
- [ ] Registro de cuenta nueva → llega el correo.
- [ ] "Olvidé mi contraseña" → llega el correo y el enlace funciona.
- [ ] Tras desplegar: en los logs de Render, la IP registrada en un login es la mía real y no una IP de Cloudflare.

## 9. Plan de reversa

`git revert` del commit de fusión: vuelven los limitadores en memoria y los modelos antiguos (que nunca se borraron). La colección `ratelimits` puede quedarse; se vacía sola por TTL. Si alguien quedó bloqueado por error antes de revertir: borrar sus documentos de `ratelimits` en Atlas.

## 10. Qué NO tocar en esta fase

- La firma y verificación de JWT, las cookies y `middleware.ts` (fase 08).
- El bloqueo por cuenta de `User`.
- `verify-email`, `reset-password`, `profile`, `check`, `logout`.
- Los textos de respuesta.

## 11. Modelo recomendado

**Modelo superior (Opus)** para implementar, o Sonnet **con revisión línea a línea del dueño** de `server/auth/rateLimit.ts` y de los dos `login/route.ts`. Motivo: la actualización atómica con pipeline y la semántica "contar solo fallos" son fáciles de escribir casi bien, y el fallo no se nota hasta que hay un ataque o un bloqueo masivo.
