# Fase 10 · API de administración y proyección pública del catálogo

> ⚠️ **ALTO RIESGO — exposición de datos y sitio público.** Cambia lo que devuelve el endpoint más usado de la tienda (`GET /api/products`). Revisión del dueño antes de fusionar.

## 1. Objetivo y por qué va en este orden

Cerrar la fuga de datos internos (S1, S2): hoy cualquiera puede leer el precio de costo y el proveedor de todos los productos. Para lograrlo sin romper el panel, primero se le da al panel su propia API (`/api/admin/*`) y después se recortan los `GET` públicos.

Va aquí porque necesita los guards y permisos (fases 08–09). Es la fase de seguridad con más valor inmediato del plan.

**Cambios visibles anunciados:**
1. Los productos marcados como inactivos (`activo: false`) dejan de aparecer en la tienda *(depende de P4; por defecto se ocultan)*.
2. En el panel reaparecen los banners y promociones **inactivos** (hoy desaparecen de la lista al desactivarlos, porque el panel lee el endpoint público que solo trae activos).

## 2. Prerrequisitos

- Fase 09 fusionada, migración 001 aplicada.
- **Respuesta a P4.** Si es "no ocultar inactivos", en el paso 2 se omite el filtro `activo` y nada más cambia.
- **Paso manual del dueño antes de fusionar:** en `/admin/inventario`, revisar cuántos productos están inactivos hoy y confirmar que deben quedar ocultos.
- Rama: `fase-10-api-admin`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Modificar | `server/services/product.service.ts` | `listarProductos` se divide en `listarProductosPublicos` y `listarProductosAdmin`; nuevas `obtenerProductoPublicoPorId`, `obtenerProductoPublicoPorSlug` |
| Modificar | `server/services/banner.service.ts` | Añadir `listarBanners()` (todos) |
| Modificar | `server/services/promotion.service.ts` | Añadir `listarPromociones()` (todas, `sort { orden: 1 }`) |
| Crear | `app/api/admin/products/route.ts` | `GET` |
| Crear | `app/api/admin/banners/route.ts` | `GET` |
| Crear | `app/api/admin/promotions/route.ts` | `GET` |
| Modificar | `app/api/products/route.ts` | `GET` usa `listarProductosPublicos` |
| Modificar | `app/api/products/[id]/route.ts` | `GET` usa `obtenerProductoPublicoPorId` |
| Modificar | `app/(tienda)/producto/[slug]/page.tsx` | Usa `obtenerProductoPublicoPorSlug` |
| Modificar | `app/(admin)/admin/page.tsx` | `loadProducts`, `loadBanners`, `loadPromotions` leen de `/api/admin/…` |
| Modificar | `app/(admin)/admin/inventario/page.tsx` | Lee productos de `/api/admin/products` |
| Modificar | `app/(admin)/admin/orden/page.tsx` | Lee productos de `/api/admin/products` |
| Modificar | `scripts/smoke.mjs` | Comprobaciones nuevas |

## 4. Pasos de implementación

**Orden obligatorio: primero el panel, después el recorte público.** Hacer un commit al final del paso 4 y otro al final del paso 7.

1. Servicios: añadir las funciones nuevas (contratos en sección 5). **No** borrar todavía `listarProductos`.
2. Rutas `/api/admin/products`, `/api/admin/banners`, `/api/admin/promotions`.
3. Cambiar las URLs en las tres páginas del panel. Solo cambia la cadena dentro de `fetch(...)`; el resto del código no se toca. En cada página, las llamadas a `/api/categories` y `/api/discounts` se quedan como están.
4. Probar el panel completo en local. **Commit.**
5. `GET /api/products` → `listarProductosPublicos()`; `GET /api/products/[id]` → `obtenerProductoPublicoPorId(id)`.
6. Página de producto → `obtenerProductoPublicoPorSlug(slug)`.
7. Eliminar `listarProductos` del servicio. Buscar usos restantes de `obtenerProductoPorId`/`obtenerProductoPorSlug` (versiones completas): solo deben quedar dentro de servicios. **Commit.**
8. Búsqueda de fugas: `grep -rn "precioCosto\|proveedor" app/\(tienda\) Components context lib` → sin resultados (si algún componente público los usaba, **detenerse y reportar**).
9. Smoke: ver sección 7.
10. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// server/services/product.service.ts
const CAMPOS_PRIVADOS = "-precioCosto -proveedor";
const FILTRO_PUBLICO = { activo: { $ne: false } };   // incluye documentos antiguos sin el campo

export async function listarProductosPublicos(): Promise<Product[]>;
//   Product.find(FILTRO_PUBLICO).select(CAMPOS_PRIVADOS).lean()
export async function obtenerProductoPublicoPorId(id: string): Promise<Product>;
//   mismo filtro y proyección; lanza noEncontrado("Producto") si no existe o está inactivo
export async function obtenerProductoPublicoPorSlug(slugParam: string): Promise<Product | null>;
//   misma búsqueda en 3 pasos que obtenerProductoPorSlug, con filtro y proyección públicos
export async function listarProductosAdmin(opts: { incluirCostos: boolean }): Promise<ProductAdmin[]>;
//   todos los productos; si !incluirCostos aplica CAMPOS_PRIVADOS
```

| Endpoint | Permiso | Respuesta |
|---|---|---|
| `GET /api/admin/products` | `inventario.ver` | `ProductAdmin[]` (todos, activos e inactivos). `precioCosto` y `proveedor` solo si el admin tiene `costos.ver` |
| `GET /api/admin/banners` | `catalogo.editar` | `Banner[]` (todos) |
| `GET /api/admin/promotions` | `catalogo.editar` | `Promotion[]` (todas) |
| `GET /api/products` | público | `Product[]` — **mismo arreglo plano de hoy**, sin `precioCosto` ni `proveedor`, sin inactivos |
| `GET /api/products/[id]` | público | `Product` con la misma proyección; 404 si inactivo |

```ts
// app/api/admin/products/route.ts
export const GET = handle(async () => {
  const admin = await requireAdmin("inventario.ver");
  return json(await listarProductosAdmin({ incluirCostos: admin.permisos.includes("costos.ver") }));
});
```

Las respuestas de `POST`/`PUT /api/products` (escritura, ya protegidas) siguen devolviendo el documento completo.

Campos que **siguen siendo públicos** a propósito: `stockCantidad`, `stockMinimo`, `codigo`, `activo`, `ordenHome`, `ordenPorCategoria`. Solo se ocultan costo y proveedor.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: `GET /api/products` conserva forma (arreglo plano) y todos los campos que usa la tienda. El paso 8 demuestra que ningún componente público leía los campos retirados. El único cambio visible es el de inactivos, anunciado.
- **N1-6**: se quitan dos campos de una respuesta pública. Es una excepción **deliberada** a "no quitar campos": son datos que nunca debieron ser públicos. Los únicos consumidores legítimos (el panel) se migran en los pasos 1–4, antes del recorte.
- **N1-4**: `/api/admin/*` queda cubierto por partida doble: proxy (fase 08) y `requireAdmin` en cada handler.
- **Caché del navegador**: `lib/cache.ts` guarda 5 minutos por URL. El panel invalida con `invalidateCachePattern("products")`, que también coincide con `/api/admin/products`. No hay que tocarlo.

## 7. Criterios de aceptación verificables

- `curl -s localhost:3000/api/products | grep -c "precioCosto"` → `0`. Igual con `proveedor`.
- `curl -s localhost:3000/producto/<slug-real> | grep -c "precioCosto"` → `0` (el HTML de la página ya no lo incluye).
- `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/admin/products` (sin cookie) → `401`.
- Con sesión `ventas`: `GET /api/admin/products` → 200 y ningún elemento tiene `precioCosto`. Con `gestor` o `superadmin` → sí lo tienen.
- Poner un producto de prueba en `activo: false`: no está en `GET /api/products`, su página devuelve 404, y **sí** está en `GET /api/admin/products`.
- Número de productos: `GET /api/products` devuelve exactamente (total − inactivos).
- Smoke: añadidos `GET /api/admin/products|banners|promotions` sin cookie → 401, y una comprobación de que el cuerpo de `GET /api/products` no contiene la cadena `"precioCosto"`.
- typecheck, lint, test, build en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa. Atención especial a: inicio, una categoría, búsqueda y "productos relacionados" en la página de producto (todos consumen `GET /api/products`).
- [ ] La tienda muestra los mismos productos que antes, salvo los que yo tenía inactivos.
- [ ] `/admin`: la lista de productos está completa (incluye inactivos). Editar uno y guardar.
- [ ] `/admin/inventario`: se ven costo, margen y proveedor; editar uno y guardar; exportar CSV.
- [ ] `/admin/orden`: carga y guarda.
- [ ] Banners y promociones: desactivar uno → **sigue apareciendo en el panel** (marcado inactivo) y desaparece de la tienda. Reactivarlo.
- [ ] En el navegador, abrir `https://<sitio>/api/products` y buscar "precioCosto": no aparece.

## 9. Plan de reversa

`git revert` del commit de fusión: el panel vuelve a leer de los endpoints públicos y estos vuelven a devolver todo. Sin cambios de datos. **Nota:** revertir reabre la fuga de costos; si el motivo de la reversa es solo el filtro de inactivos, es preferible un commit que quite únicamente `FILTRO_PUBLICO`.

## 10. Qué NO tocar en esta fase

- Los componentes públicos (`HomeProducts`, `ProductCard`, páginas de categoría y búsqueda): siguen descargando la lista completa y filtrando en el navegador. Paginar o filtrar en servidor está fuera del plan.
- `GET /api/categories` y `GET /api/discounts` (no exponen nada sensible).
- La lógica de formularios del panel: solo cambian las URLs de lectura.

## 11. Modelo recomendado

**Sonnet**, con revisión del dueño centrada en dos cosas: la lista de campos privados y el resultado del paso 8. Si en el paso 8 aparece algún uso público de costo o proveedor, escalar a un **modelo superior** o al dueño antes de seguir.
