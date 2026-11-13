# Fase 11 · Endurecer la subida de imágenes a Cloudinary

## 1. Objetivo y por qué va en este orden

Aplicar la decisión D-24: la subida sigue pasando por el servidor, pero ahora inspecciona el contenido real del archivo, limita dimensiones, evita que dos banners o promociones se pisen y permite borrar imágenes de las tres carpetas. Resuelve S10.

Va después de la fase 08 (el handler ya tiene `requireAdmin`) y antes de partir el panel (fase 12) para que el componente de subida se extraiga ya contra un backend estable.

**Cambio visible anunciado:** el panel rechaza archivos que no sean JPEG, PNG, WebP o AVIF (antes aceptaba cualquier cosa que el navegador llamara "imagen", incluidos GIF y SVG).

## 2. Prerrequisitos

- Fase 10 fusionada.
- **Respuesta a P12** (¿hay banners animados en GIF?). Por defecto: GIF no se acepta.
- Pruebas contra Cloudinary real: **requieren permiso explícito del dueño en la sesión** (N1-8) y se hacen con productos/banners de prueba que luego se borran.
- Rama: `fase-11-subida-cloudinary`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `server/services/upload.service.ts` | `prepararImagen`, `subirImagenes`, `eliminarImagen` |
| Crear | `server/validation/upload.schema.ts` | Validación de los campos del formulario |
| Modificar | `server/cloudinary.ts` | `uploadToCloudinary` acepta `overwrite`; `generateBannerPublicId` y `generatePromocionPublicId` añaden sufijo de tiempo |
| Modificar | `app/api/upload/route.ts` | Ruta delgada |
| Modificar | `app/api/upload/delete/route.ts` | Ruta delgada; prefijos ampliados |

## 4. Pasos de implementación

1. `server/validation/upload.schema.ts` (contrato en sección 5). Los valores se leen de `FormData` con `formData.get(...)` y se pasan al esquema como objeto.
2. `server/services/upload.service.ts`:
   - `prepararImagen(buffer)`:
     1. `const img = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 })`.
     2. `const meta = await img.metadata()` dentro de `try`; si lanza → `entradaInvalida({ images: "El archivo no es una imagen válida" })`.
     3. Si `meta.format` no está en `["jpeg","png","webp","avif"]` → `entradaInvalida({ images: "Formato no permitido. Usa JPG, PNG, WebP o AVIF" })`.
     4. Si `meta.width > 2000 || meta.height > 2000` → `img.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).toBuffer()` (conserva el formato de entrada). Si no, devolver el **buffer original sin recodificar**.
   - `subirImagenes(args)`: valida cantidad y tamaño, llama a `prepararImagen` por archivo, genera el `public_id` igual que hoy y sube. Las subidas siguen en paralelo (`Promise.all`).
   - `eliminarImagen(publicId)`: valida el patrón y el prefijo, llama a `deleteFromCloudinary`.
3. `server/cloudinary.ts`:
   - `generateBannerPublicId(sub, nombre)` → `` `banners/${sub}/${slug}-${Date.now()}` ``.
   - `generatePromocionPublicId(sub, nombre)` → `` `promociones/${sub}/${slug}-${Date.now()}` ``.
   - `uploadToCloudinary(buffer, publicId, options)`: `overwrite: false` fijo. Quitar los `console.log`/`console.error` y usar `log`.
4. Rutas: `handle` + `requireAdmin("catalogo.editar")` + servicio. Conservar `export const runtime = "nodejs"` y `export const dynamic = "force-dynamic"`.
5. La comprobación `file.type.startsWith("image/")` se mantiene como primer filtro barato; la autoridad es `prepararImagen`.
6. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

**La petición y la respuesta de `POST /api/upload` no cambian.**

Campos del formulario (`multipart/form-data`):

| Campo | Tipo | Regla |
|---|---|---|
| `images` | archivo(s) | 1–10 si `entity = producto`; exactamente 1 si `banner` o `promocion`. Máx. 5 MB cada uno |
| `entity` | `"producto" \| "banner" \| "promocion"` | Por defecto `"producto"` |
| `nombreProducto`, `categoriaSlug`, `tags`, `existingCount` | texto | Solo `producto`. `existingCount` entero 0–50 |
| `bannerNombre`, `bannerSubcarpeta` | texto | `bannerSubcarpeta` ∈ `home \| categorias \| campanas` |
| `promocionNombre`, `promocionSubcarpeta` | texto | `promocionSubcarpeta` ∈ `ofertas \| combos \| publicidad` |

Respuesta 200: `{ success: true, images: [{ public_id, secure_url, width, height, bytes, index }], entity }` (idéntica a hoy).
Errores: 400 `{ error, code: "ENTRADA_INVALIDA", fields: { images: "…" } }`; antes los errores de validación salían como 500 con el mensaje en `error`. El panel muestra `error` en ambos casos.

```ts
// server/services/upload.service.ts
export async function prepararImagen(buffer: Buffer): Promise<{ buffer: Buffer; formato: "jpeg" | "png" | "webp" | "avif" }>;
export async function subirImagenes(args: {
  archivos: File[];
  entidad: "producto" | "banner" | "promocion";
  producto?: { nombre: string; categoriaSlug: string; tags: string[]; existentes: number };
  banner?: { nombre: string; subcarpeta: "home" | "categorias" | "campanas" };
  promocion?: { nombre: string; subcarpeta: "ofertas" | "combos" | "publicidad" };
}): Promise<{ public_id: string; secure_url: string; width: number; height: number; bytes: number; index: number }[]>;
export async function eliminarImagen(publicId: string): Promise<void>;
```

`DELETE /api/upload/delete` — cuerpo `{ publicId: string }`:
- Debe cumplir `/^(productos|banners|promociones)\/[a-z0-9\/_-]+$/` y no contener `..` → si no, 403 `{ error: "public_id no permitido" }` (mismo texto de hoy).
- Respuesta: `{ success: true, deleted: publicId }` (igual que hoy).

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-6**: contrato de petición y respuesta intacto; solo cambian códigos de error de 500 a 400.
- **N1-1**: las imágenes ya subidas no se tocan. Las nuevas de producto conservan el mismo patrón de `public_id`. Las de menos de 2 000 px se suben byte a byte como hoy.
- **N1-8**: no se llama a Cloudinary sin permiso del dueño en la sesión; las pruebas automáticas de `prepararImagen` no lo necesitan (trabajan con buffers locales).
- **N1-7**: `sharp` ya está en `package.json`; no se instala nada.
- **No** se borran imágenes de Cloudinary al eliminar un producto (D-24, punto 6).

## 7. Criterios de aceptación verificables

Sin tocar Cloudinary (llamando a `prepararImagen` desde un script temporal o desde la consola de Node; no se añade prueba Vitest porque `server/` es `server-only`):
- Un archivo de texto renombrado a `.jpg` → error "no es una imagen válida".
- Un SVG → error de formato no permitido.
- Un JPEG de 4000×3000 → sale de 2000×1500, formato `jpeg`.
- Un PNG de 800×800 → el buffer devuelto es **el mismo objeto** que el de entrada.

Con sesión admin y permiso del dueño:
- Subir dos banners con el mismo título → dos `public_id` distintos.
- `DELETE /api/upload/delete` con `{ "publicId": "banners/home/x-123" }` → 200. Con `{ "publicId": "otra/cosa" }` → 403. Con `{ "publicId": "productos/../x" }` → 403.
- Sin sesión → 401 en ambos endpoints.
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Producto de prueba: subir 3 fotos normales, cambiar la principal, reordenar, borrar una, guardar. Reabrir: están como las dejé.
- [ ] Subir una foto muy grande del móvil (más de 2 000 px): sube bien y se ve nítida en la tienda.
- [ ] Intentar subir un PDF o un `.txt` renombrado a `.jpg` → mensaje de error claro, el formulario no se rompe.
- [ ] Banner de prueba: crear, y luego crear otro con el mismo título → ambos conservan su propia imagen.
- [ ] Promoción de prueba: crear con imagen, editar cambiando la imagen.
- [ ] Borrar los elementos de prueba.

## 9. Plan de reversa

`git revert` del commit de fusión. Las imágenes subidas durante la fase siguen siendo válidas (las URLs guardadas no dependen del código). Sin cambios de datos.

## 10. Qué NO tocar en esta fase

- El componente de subida dentro de `app/(admin)/admin/page.tsx` (se extrae en la fase 12).
- Las funciones locales `getCloudinaryUrl` de `ProductCard` y del panel.
- `next.config.ts` (lista de hosts y CSP).
- No implementar subida directa firmada ni limpieza automática de huérfanos.

## 11. Modelo recomendado

**Sonnet.** Cambio acotado con contrato fijo; la única sutileza (no recodificar imágenes pequeñas) está especificada.
