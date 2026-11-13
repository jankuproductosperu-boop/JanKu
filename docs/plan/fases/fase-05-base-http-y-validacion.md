# Fase 05 · Base HTTP, validación y utilidades puras

## 1. Objetivo y por qué va en este orden

Crear las piezas comunes que usarán todos los endpoints: errores tipados, envoltorio de handlers, registro, esquemas de validación de las cinco entidades de catálogo y tres utilidades puras con pruebas (`money`, `stock`, `slug`). **Solo se crean archivos nuevos: ningún endpoint los usa todavía**, así que el comportamiento no cambia. Va justo antes de la fase 06, que es la que conecta las rutas.

## 2. Prerrequisitos

- Fase 04 fusionada. `zod` instalado (fase 01).
- Sin pasos manuales del dueño.
- Rama: `fase-05-base-http`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `server/http/errors.ts` | `AppError` y fábricas |
| Modificar | `server/http/respond.ts` | Añadir `json`, `fail`, `handle` (ya contiene `SECURITY_HEADERS`) |
| Crear | `server/logger.ts` | `log.info`, `log.warn`, `log.error` |
| Crear | `server/validation/common.ts` | Piezas Zod reutilizables |
| Crear | `server/validation/product.schema.ts` | `productoCrearSchema`, `productoActualizarSchema`, `reordenarSchema` |
| Crear | `server/validation/category.schema.ts` | `categoriaCrearSchema`, `categoriaActualizarSchema` |
| Crear | `server/validation/banner.schema.ts` | `bannerCrearSchema`, `bannerActualizarSchema` |
| Crear | `server/validation/promotion.schema.ts` | `promocionCrearSchema`, `promocionActualizarSchema` |
| Crear | `server/validation/discount.schema.ts` | `nivelCrearSchema`, `nivelActualizarSchema` |
| Crear | `lib/money.ts` | `redondear2`, `formatearSoles` |
| Crear | `lib/stock.ts` | `estadoDeStock` |
| Crear | `lib/__tests__/money.test.ts`, `stock.test.ts`, `slug.test.ts` | Pruebas |
| Eliminar | `lib/__tests__/humo.test.ts` | Ya hay pruebas reales |

## 4. Pasos de implementación

1. `server/http/errors.ts` según el contrato.
2. `server/http/respond.ts`: añadir `json`, `fail`, `handle`.
3. `server/logger.ts`.
4. `server/validation/common.ts` y los cinco esquemas. **Antes de escribir cada esquema, abrir el modelo correspondiente en `models/` y el formulario del admin que lo envía** (`app/(admin)/admin/page.tsx`, `inventario/page.tsx`, `descuentos/page.tsx`) y comprobar que todo campo que el admin envía hoy está en el esquema. Si falta alguno, añadirlo como opcional y anotarlo en el reporte.
5. `lib/money.ts`, `lib/stock.ts` y sus pruebas. Añadir prueba para `lib/slug.ts` (creado en la fase 03).
6. `npm run typecheck && npm run lint && npm test && npm run build`.
7. Ejecutar la fase 00.

## 5. Contratos

```ts
// server/http/errors.ts
export class AppError extends Error {
  constructor(public status: number, message: string, public code: string, public fields?: Record<string, string>) { super(message); }
}
export const entradaInvalida = (fields?: Record<string, string>, mensaje = "Datos inválidos") => new AppError(400, mensaje, "ENTRADA_INVALIDA", fields);
export const noAutorizado = (mensaje = "No autorizado") => new AppError(401, mensaje, "NO_AUTORIZADO");
export const prohibido = (mensaje = "No tienes permiso para esta acción") => new AppError(403, mensaje, "PROHIBIDO");
export const noEncontrado = (que: string) => new AppError(404, `${que} no encontrado`, "NO_ENCONTRADO");
export const conflicto = (mensaje: string, code = "CONFLICTO") => new AppError(409, mensaje, code);
export const demasiadosIntentos = (minutos?: number) =>
  new AppError(429, minutos ? `Demasiados intentos. Intenta en ${minutos} minutos.` : "Demasiados intentos. Intenta más tarde.", "DEMASIADOS_INTENTOS");
```

```ts
// server/http/respond.ts
export const SECURITY_HEADERS: Record<string, string>;   // ya existe
export function json<T>(data: T, init?: { status?: number; headers?: Record<string, string> }): NextResponse;
export function fail(error: AppError): NextResponse;      // cuerpo: { error, code, fields? }
type Ctx = { params: Promise<Record<string, string>> };
export function handle(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>): (req: NextRequest, ctx: Ctx) => Promise<Response>;
```
Reglas de `handle`:
- `AppError` → `fail(error)`.
- `ZodError` → 400, `code: "ENTRADA_INVALIDA"`, `error: "Datos inválidos"`, `fields` = primer mensaje por ruta (`issue.path.join(".")`).
- Cuerpo que no es JSON (`SyntaxError` al parsear) → 400, `error: "Formato inválido"`.
- Error de Mongo con `code === 11000` → 409, `code: "DUPLICADO"`, `error: "Ya existe un registro con ese valor"`, `fields` con la clave de `keyPattern`.
- `CastError` de Mongoose (id mal formado) → 404, `code: "NO_ENCONTRADO"`.
- Cualquier otro → `log.error(...)` y 500 con `{ error: "Error en el servidor", code: "ERROR_INTERNO" }`. **Nunca** se devuelve `error.message` de un error no controlado.

```ts
// server/logger.ts
export const log: {
  info(evento: string, datos?: Record<string, unknown>): void;
  warn(evento: string, datos?: Record<string, unknown>): void;
  error(evento: string, error: unknown, datos?: Record<string, unknown>): void;
};
// Salida: console.log/warn/error de una línea JSON: { nivel, evento, ts, ...datos }.
// Para error: añade { mensaje, stack } (stack solo si NODE_ENV !== "production").
```

```ts
// server/validation/common.ts
export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Identificador inválido");
export const texto = (max: number) => z.string().trim().max(max);
export const textoRequerido = (max: number) => z.string().trim().min(1, "Obligatorio").max(max);
export const dinero = z.coerce.number().finite().min(0, "No puede ser negativo").max(999999);
export const enteroNoNegativo = z.coerce.number().int().min(0).max(999999);
export const listaTexto = (maxItems: number, maxLen: number) => z.array(z.string().trim().max(maxLen)).max(maxItems);
export const urlOVacio = z.string().trim().max(500);   // no se valida formato: hay URLs antiguas y rutas relativas
```

```ts
// server/validation/product.schema.ts   (objetos NO estrictos: descartan claves desconocidas, no fallan)
export const productoCrearSchema = z.object({
  nombre: textoRequerido(200),
  precio: dinero,
  descripcion: texto(2000).optional(),
  descripcionCompleta: texto(20000).optional(),
  categorias: listaTexto(20, 100).optional(),
  categoriaSlugs: listaTexto(20, 100).optional(),
  stock: z.enum(["Disponible", "Limitado", "Agotado"]).optional(),   // se retira en la fase 13
  imagenes: listaTexto(10, 300).optional(),
  imagenPrincipal: texto(300).optional(),
  imagenUrl: urlOVacio.optional(),
  imagenesAdicionales: z.array(urlOVacio).max(10).optional(),
  videoUrl: urlOVacio.optional(),
  deliveryHuancayo: z.boolean().optional(),
  mostrarEnHome: z.boolean().optional(),
  envioGratis: z.boolean().optional(),
  whatsappLink: urlOVacio.optional(),
  whatsappNumero: texto(20).optional(),
  caracteristicas: listaTexto(50, 500).optional(),
  garantia: texto(500).optional(),
  tags: listaTexto(30, 50).optional(),
  metaTitulo: texto(200).optional(),
  metaDescripcion: texto(500).optional(),
  metaImagen: urlOVacio.optional(),
  codigo: texto(50).optional(),
  precioCosto: dinero.optional(),
  stockCantidad: enteroNoNegativo.optional(),
  stockMinimo: enteroNoNegativo.optional(),
  proveedor: texto(200).optional(),
  activo: z.boolean().optional(),
});
export const productoActualizarSchema = productoCrearSchema.partial();
export const reordenarSchema = z.object({
  context: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/),
  orden: z.array(z.object({ id: objectId, orden: z.coerce.number().int().min(0).max(100000) })).min(1).max(1000),
});
```
Campos que **no** están y por tanto se descartan si llegan: `_id`, `slug`, `codigoUrl`, `ordenHome`, `ordenPorCategoria`, `createdAt`, `updatedAt`, `__v`.

Los otros cuatro esquemas siguen el mismo patrón, con exactamente los campos de su modelo:

| Esquema | Campos obligatorios | Campos opcionales |
|---|---|---|
| `categoriaCrearSchema` | `nombre` (1–100) | `descripcion` (500), `imagenUrl`, `activo`, `orden` (entero ≥ 0) |
| `bannerCrearSchema` | `titulo` (1–200), `imagenUrl` (no vacío), `posicion` (enum de 5 valores) | `enlace`, `ubicaciones` (lista ≤ 50 de ≤ 100), `activo` |
| `promocionCrearSchema` | `titulo` (1–200), `precio`, `imagenUrl` (no vacío) | `descripcion`, `descripcionCompleta`, `precioAnterior`, `imagenesAdicionales`, `tipoEtiqueta` (enum), `stock` (enum), `activo`, `orden`, `whatsappLink`, `whatsappNumero`, `caracteristicas`, `metaTitulo`, `metaDescripcion`, `metaImagen` |
| `nivelCrearSchema` | `nombre` (1–100), `montoMinimo` (dinero), `valorDescuento` (dinero) | `tipoDescuento` (enum, por defecto `"porcentaje"`), `activo`. Regla cruzada: si `tipoDescuento === "porcentaje"`, `valorDescuento <= 100` |

Cada `*ActualizarSchema` es el `.partial()` de su `*CrearSchema`. `categoriaActualizarSchema` mantiene `nombre` obligatorio (el endpoint actual lo exige).

```ts
// lib/money.ts
export function redondear2(n: number): number;        // Math.round((n + Number.EPSILON) * 100) / 100
export function formatearSoles(n: number): string;    // "S/ 12.50"

// lib/stock.ts
import type { StockEstado } from "@/types";
export function estadoDeStock(cantidad: number, minimo = 5): StockEstado;
// cantidad <= 0 → "Agotado"; cantidad <= minimo → "Limitado"; si no → "Disponible"
```

Pruebas mínimas: `redondear2(1.005) === 1.01`, `redondear2(10) === 10`, `redondear2(0.1 + 0.2) === 0.3`; `formatearSoles(12.5) === "S/ 12.50"`; `estadoDeStock(0)`, `(-1)`, `(5)`, `(6)`, `(3, 2)`, `(2, 2)`; `slugify("Árbol de Navidad 2×1!")`, cadena vacía, solo símbolos.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-6**: los esquemas no son `.strict()`. Un campo extra del admin se descarta, no provoca error 400.
- **N1-4**: `handle` nunca filtra mensajes internos al cliente.
- **N1-7**: no se modifica ningún `route.ts` en esta fase.

## 7. Criterios de aceptación verificables

- `npm test` → pruebas de `money`, `stock` y `slug` en verde (≥ 12 aserciones).
- `git diff --stat main -- app Components context hooks models` → vacío.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run smoke` en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (debe verse idéntico: nada usa aún el código nuevo).

## 9. Plan de reversa

`git revert` del commit de fusión. Son solo archivos nuevos sin uso.

## 10. Qué NO tocar en esta fase

- Ningún `route.ts`, página, componente ni modelo.
- No crear esquemas de pedidos, cupones ni administradores.
- No reemplazar todavía la lógica de stock de `models/Product.ts` (fase 06).

## 11. Modelo recomendado

**Sonnet.** Contratos completamente especificados.
