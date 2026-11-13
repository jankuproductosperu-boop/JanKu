# Fase 03 · Reorganizar `lib/` y retirar código muerto

## 1. Objetivo y por qué va en este orden

Separar físicamente el código según dónde corre: `server/` (solo servidor), `lib/` (puro), `hooks/` (React). Hoy `lib/` mezcla los tres. También retira archivos sin ningún uso y aparta los scripts antiguos. **Solo se mueven archivos y se actualizan imports; ninguna función cambia su comportamiento.** Va antes de crear servicios (fase 06) para que el código nuevo nazca en su sitio.

## 2. Prerrequisitos

- Fase 02 fusionada.
- Sin pasos manuales del dueño.
- Rama: `fase-03-reorganizar-lib`.

## 3. Archivos a crear, modificar o mover

**Mover con `git mv`**

| De | A |
|---|---|
| `lib/useAuth.ts` | `hooks/useAuth.ts` |
| `lib/useScrollDirection.ts` | `hooks/useScrollDirection.ts` |
| `lib/mongodb.ts` | `server/db.ts` |
| `lib/cloudinary.ts` | `server/cloudinary.ts` |
| `lib/email.ts` | `server/email/auth-emails.ts` |
| `lib/authUtils.ts` | `server/auth/legacyLimiters.ts` (y de ahí se extraen partes, ver abajo) |
| `scripts/add-admin.js`, `change-password.js`, `create-admin.js`, `delete-admin.js`, `migrate-categories.js`, `migrate-codigoUrl.js`, `migrate-inventory.js`, `migrate-whatsapp-numero.js`, `fixImages.ts` | `scripts/legacy/` (mismo nombre) |

**Crear (extrayendo código existente, sin reescribirlo)**

| Ruta | Sale de | Contenido |
|---|---|---|
| `server/auth/validators.ts` | `lib/authUtils.ts` | `validarEmail`, `validarPassword`, `validarNombre` |
| `server/auth/tokens.ts` | `lib/authUtils.ts` | `generarToken`, `hashearToken` |
| `server/auth/ip.ts` | `lib/authUtils.ts` | `obtenerIP` |
| `server/http/respond.ts` | `lib/authUtils.ts` | `SECURITY_HEADERS` (solo esta constante por ahora) |
| `server/email/send.ts` | `lib/email.ts` | función `sendEmail` (se exporta) y las constantes `FROM_EMAIL`, `SITE_URL` |
| `lib/slug.ts` | `lib/cloudinary.ts` | `export function slugify(texto: string): string` (cuerpo idéntico a `generateSlug`) |
| `lib/cloudinaryUrl.ts` | `lib/cloudinary.ts` | `getCloudinaryUrl` con el mismo cuerpo, leyendo solo `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` |

**Quedan así tras la fase**

- `server/auth/legacyLimiters.ts`: contiene `userRateLimiter`, `registerRateLimiter`, `resendVerificationLimiter` (de `authUtils.ts`) **y** `loginTracker` (traído de `lib/loginAttempts.ts`, que se elimina con `git rm`). Cabecera: `// TEMPORAL: se elimina en la fase 07.`
- `server/cloudinary.ts`: conserva la configuración del SDK, `CloudinaryUploadResult`, `generatePublicId`, `generateBannerPublicId`, `generatePromocionPublicId`, `uploadToCloudinary`, `deleteFromCloudinary`. Importa `slugify` de `@/lib/slug` y lo reexporta como `generateSlug` para no cambiar a quien lo usa.
- `server/email/auth-emails.ts`: las tres funciones `enviarEmail*`, importando `sendEmail` de `./send`.
- `lib/productUrl.ts`: su `textoASlug` local se reemplaza por `import { slugify } from "@/lib/slug"`.

**Eliminar con `git rm`** (comprobar antes con búsqueda que nadie los importa)

`lib/useAuthUser.ts`, `lib/useImageUpload.ts`, `lib/loginAttempts.ts` (tras fusionarlo), `Components/ImageUploader/ImageUploader.tsx`, `Components/Cart/index.ts`.

**Modificar (solo la línea de import)**

Todo archivo que importe de las rutas viejas. Sustituciones exactas:

| Import viejo | Import nuevo |
|---|---|
| `@/lib/mongodb` | `@/server/db` |
| `@/lib/useAuth` | `@/hooks/useAuth` |
| `@/lib/useScrollDirection` | `@/hooks/useScrollDirection` |
| `@/lib/cloudinary` | `@/server/cloudinary` |
| `@/lib/email` | `@/server/email/auth-emails` |
| `@/lib/loginAttempts` | `@/server/auth/legacyLimiters` |
| `@/lib/authUtils` | se reparte: validadores → `@/server/auth/validators`; tokens → `@/server/auth/tokens`; `obtenerIP` → `@/server/auth/ip`; `SECURITY_HEADERS` → `@/server/http/respond`; limitadores → `@/server/auth/legacyLimiters` |

Además, en `app/api/auth/login/route.ts`: borrar la función local `getClientIP` y la constante local `SECURITY_HEADERS`; importar `obtenerIP` y `SECURITY_HEADERS` de sus nuevos módulos (son idénticas a las locales: comprobarlo antes).

## 4. Pasos de implementación

1. Verificar el código muerto: para cada archivo a eliminar, `grep -rn "<nombre>" app Components context lib hooks` debe devolver solo el propio archivo (y, para `useImageUpload`/`ImageUploader`, la referencia cruzada entre ellos dos). Si aparece otro uso, **no eliminar** y reportar.
2. Hacer los movimientos con `git mv`, de uno en uno, ejecutando `npm run typecheck` tras cada grupo.
3. Extraer los módulos nuevos **cortando y pegando** el código tal cual. No renombrar funciones ni cambiar firmas.
4. Añadir `import "server-only";` como primera línea de **todos** los archivos bajo `server/`.
5. Actualizar imports con la tabla de sustituciones.
6. Mover los scripts a `scripts/legacy/`. Dentro de cada uno, la línea `require('dotenv').config({ path: '.env.local' })` sigue funcionando (la ruta es relativa al directorio desde el que se ejecuta). Añadir al inicio de cada script un comentario: `// LEGACY: script ya aplicado. No ejecutar sin revisar. Ver docs/plan/02-datos.md`.
7. `npm run typecheck && npm run lint && npm test && npm run build`.
8. Actualizar `docs/plan/linea-base.md` con el nuevo conteo de lint (los 21 errores de `scripts/*.js` deben desaparecer por la exclusión añadida en la fase 01).
9. Ejecutar la fase 00.

## 5. Contratos

Ninguna firma cambia. Los únicos nombres nuevos:

```ts
// lib/slug.ts
export function slugify(texto: string): string;
// minúsculas → NFD → quitar diacríticos → no [a-z0-9] a "-" → recortar "-" de los extremos

// lib/cloudinaryUrl.ts
export function getCloudinaryUrl(
  publicId: string,
  options?: { width?: number; height?: number; crop?: string; quality?: string }
): string;

// server/email/send.ts
export async function sendEmail(args: { to: string; subject: string; html: string }): Promise<void>;
export const FROM_EMAIL: string;
export const SITE_URL: string;
```

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: `getCloudinaryUrl` de `lib/cloudinaryUrl.ts` **no** reemplaza a las funciones locales del mismo nombre que hay en `Components/ProductCard/ProductCard.tsx` ni en `app/admin/page.tsx` (D-25): generan URLs distintas. No tocarlas.
- **N1-4**: los limitadores se mueven de archivo pero deben seguir siendo **las mismas instancias únicas** (un solo `export const` de cada uno). No duplicarlos.
- **N1-9**: `git mv` exacto; no cambiar mayúsculas de ningún nombre.
- **`server-only`**: si el build falla con "You're importing a component that needs server-only", algún archivo de cliente importa de `server/`. Corregir el import para que apunte a `lib/`; nunca quitar el `import "server-only"`.

## 7. Criterios de aceptación verificables

- `ls lib` → solo `cache.ts`, `cloudinaryUrl.ts`, `productUrl.ts`, `slug.ts`, `whatsapp.ts`, `__tests__/`.
- `grep -rn "@/lib/\(mongodb\|authUtils\|email\|cloudinary\"\|loginAttempts\|useAuth\|useScrollDirection\)" app Components context hooks server` → vacío.
- `grep -rL 'import "server-only"' server --include=*.ts` → vacío.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke` en verde.
- `npm run lint` → 21 errores menos que la línea base de la fase 01.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (debe verse idéntico).
- [ ] Entrar a `/login-admin` con credenciales correctas → entra. Con contraseña incorrecta → mensaje de error con intentos restantes.
- [ ] En `/admin`: subir una imagen a un producto de prueba y guardarlo → la imagen se ve.
- [ ] Registrar una cuenta de cliente de prueba → llega el correo de verificación.
- [ ] "Olvidé mi contraseña" → llega el correo.

## 9. Plan de reversa

`git revert` del commit de fusión. Sin cambios de datos. Los scripts movidos vuelven a su lugar con el revert.

## 10. Qué NO tocar en esta fase

- La lógica interna de cualquier función movida.
- `app/admin/page.tsx` más allá de su línea de import de `useAuth`.
- `middleware.ts`, `models/`, `next.config.ts`.
- Los archivos de página no se mueven todavía (fase 04).

## 11. Modelo recomendado

**Sonnet.** Movimientos mecánicos verificados por el compilador y el build.
