# Fase 26a · Copia de seguridad de la base y endurecimiento de las rutas de cuenta

> **Aprobada por el dueño (2026-11-21).** Primera de las fases de seguridad (26a, 26b, 26c). Modelo: Opus 5.5.

> Riesgo bajo: no cambia lo que ve el cliente ni la forma de las respuestas (N1-1, N1-6).

## 1. Objetivo

1. **Copias de seguridad.** MongoDB Atlas M0 (plan gratuito) no hace copias automáticas. Esta fase añade un script que guarda todas las colecciones en `backups/` y otro para restaurar.
2. **Rutas antiguas de cuenta con Zod.** Las 7 rutas de `app/api/auth/login` y `app/api/auth-user/*` validan el cuerpo a mano. No se encontró una inyección explotable, pero una entrada rara (un arreglo en vez de un texto) termina en 500. Se validan con esquemas Zod `.strict()` manteniendo **exactamente** las mismas respuestas y mensajes (N1-4, N1-6).
3. **Cabecera obsoleta.** `X-XSS-Protection: 1; mode=block` pasa a `0`, que es lo que recomiendan OWASP y los navegadores actuales. El filtro antiguo está retirado y, donde existe, puede usarse para filtrar datos. La protección real contra XSS es la CSP, que no cambia.

**Descartado:** `mongoose.set("sanitizeFilter", true)`. Envuelve cualquier objeto con claves `$` en `$eq` y rompería consultas propias como `{ _id: { $ne: id } }`. La validación con Zod cubre ese riesgo.

## 2. Copia de seguridad

`node scripts/backup/respaldar.mjs`
- Solo lee. Usa la `MONGODB_URI` de `.env.local` y no la imprime.
- Guarda una carpeta `backups/respaldo-<base>-<fecha>/` con un `.json` por colección en EJSON, que conserva `ObjectId` y fechas, más `manifiesto.json` con cuántos documentos tiene cada colección.
- `backups/` ya está fuera de git. La copia contiene correos, teléfonos y hashes de contraseñas: se guarda en un disco o nube privada, nunca en un lugar compartido.

`node scripts/backup/restaurar.mjs <carpeta> [--apply]`
- Por defecto **simula**: dice cuántos documentos faltan en la base y se repondrían.
- Con `--apply` (solo el dueño, pidiendo teclear el nombre de la base) **solo inserta los documentos cuyo `_id` no existe**. Nunca sobrescribe, nunca borra (N1-3). Sirve para recuperar lo borrado por error, no para volver atrás cambios.

**Rutina recomendada:** una copia por semana de `jankuDB` y otra antes de cada migración o cambio grande.

## 3. Archivos

- `scripts/backup/respaldar.mjs` y `scripts/backup/restaurar.mjs` (nuevos, sobre `scripts/migrations/_runner.mjs`)
- `server/validation/auth.schema.ts` (nuevo): esquemas de login de administrador, login, registro, recuperación, restablecimiento, verificación y perfil
- `app/api/auth/login/route.ts`, `app/api/auth-user/{login,register,forgot-password,reset-password,verify-email,profile}/route.ts`: solo el bloque que lee y valida el cuerpo
- `next.config.ts`: `X-XSS-Protection: 0`
- `scripts/smoke.mjs`: cuerpos con tipos equivocados responden 400 y no 500
- `docs/plan/03-decisiones.md` (D-89), `docs/plan/02-datos.md` (copias y restauración)

Sin dependencias nuevas (EJSON viene con el driver que ya usa Mongoose).

## 4. Verificación

typecheck, lint (0 errores), test, build, una ejecución del smoke. Copia de prueba en `janku-dev` y restauración simulada sobre esa misma copia (debe decir «0 documentos por reponer»).
